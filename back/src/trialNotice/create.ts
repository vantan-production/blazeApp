// POST /api/trial-notices — 管理者が選んだ体験申込者へ連絡メールを送る（admin 以上）
//
// - 宛先は application_ids で受け取る（日付で自動的に決めず、管理者が画面で選ぶ）
// - 1人1通ずつ個別に送る（他の家庭のアドレスが見えないように。mail.ts の buildTrialNoticeEmail 参照）
// - 失敗した送信はその場で数回やり直す（一時的な 429 やネットワークの揺れで取りこぼさないため）
// - 履歴には送信に成功した宛先だけを、送信後にまとめて保存する。
//   1件も届かなければ何も保存しない（誰にも届いていない連絡が「送信済み」に見えないように）
// - それでも失敗した宛先は failed で返し、管理画面がそのまま選び直して再送できるようにする
// - 送信にかけてよい時間（SEND_BUDGET_MS）を超えたら残りは送らずに failed で返す
//   （ALB のアイドルタイムアウト 60 秒を超えて 504 になり、結果が管理者に返らなくなるのを防ぐ）

import { inArray } from "drizzle-orm";
import type { Context } from "hono";
import { asc, z } from "../index.js";
import {
  bodySchema,
  db,
  sendTrialNoticeEmail,
  titleSchema,
  trialApplication,
  trialNotice,
  trialNoticeRecipient,
} from "../shared/index.js";
import { logAppError } from "../utils/monitoring.js";

// 1回の送信で選べる上限。時間内に送り切れなかった分は SEND_BUDGET_MS で打ち切って failed で返す
const MAX_RECIPIENTS = 100;

const schema = z.object({
  title: titleSchema,
  body: bodySchema,
  application_ids: z
    .array(z.guid("申込者のIDが正しくありません。"), "送信先を選択してください。")
    .min(1, "送信先を選択してください。")
    .max(MAX_RECIPIENTS, `送信先は${MAX_RECIPIENTS}件までにしてください。`)
    .refine((ids) => new Set(ids).size === ids.length, "同じ申込者が重複して選択されています。"),
});

// Resend は既定で毎秒2リクエストまでのため、宛先ごとに間隔をあけて送る。
// 一斉に投げると後半が 429 で落ち、一部の家庭にだけ届かない状態になる
const SEND_INTERVAL_MS = 600;
// 1宛先あたりの試行回数と、やり直す前の待ち時間（1回目の失敗後 1s、2回目の失敗後 2s）
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 2000];
// 送信に使ってよい時間。ALB のアイドルタイムアウト（既定 60 秒）に対し、
// 打ち切り直前に始めた1通の送信と履歴の保存が終わるだけの余裕を残す
const SEND_BUDGET_MS = 40_000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// テストでは待たない（リトライや間隔の検証で秒単位の待ちが積み上がらないように）
const shouldWait = () => process.env.NODE_ENV !== "test";

/** リクエストボディをJSONとして読む（不正なら null） */
async function readJson(c: Context): Promise<unknown | null> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

// レスポンスで返す宛先（申込1件につき1つ）
interface Recipient {
  application_id: string;
  name: string;
  email: string;
  trial_date: string;
}

// 同じアドレスでまとめた送信単位（兄弟で申し込んだ家庭などには1通だけ送る）
interface MailGroup {
  email: string;
  applications: Recipient[];
}

/** 送信を諦めたときのエラー。何回試したかをログに残すために持たせる */
class SendFailedError extends Error {
  constructor(
    readonly attempts: number,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
  }
}

/**
 * 失敗したら最大 MAX_ATTEMPTS 回まで送り直す。最後まで失敗したら SendFailedError を投げる。
 * 待つと deadline を過ぎる場合は、やり直さずにその時点で諦める
 */
async function sendWithRetry(
  to: string,
  data: { title: string; body: string },
  deadline: number,
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await sendTrialNoticeEmail(to, data);
      return;
    } catch (e) {
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? 0;
      if (attempt >= MAX_ATTEMPTS || Date.now() + delay > deadline) {
        throw new SendFailedError(attempt, e);
      }
      if (shouldWait()) await wait(delay);
    }
  }
}

export async function create(c: Context) {
  const user = c.get("user") as { id: string };

  const json = await readJson(c);
  if (json === null) {
    return c.json({ success: false, errors: "リクエストのJSON形式が不正です" }, 400);
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    return c.json(
      {
        success: false,
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      400,
    );
  }

  const { title, body, application_ids: applicationIds } = result.data;

  const applications: Recipient[] = await db
    .select({
      application_id: trialApplication.id,
      name: trialApplication.name,
      email: trialApplication.email,
      trial_date: trialApplication.trial_date,
    })
    .from(trialApplication)
    .where(inArray(trialApplication.id, applicationIds))
    .orderBy(
      asc(trialApplication.trial_date),
      asc(trialApplication.furigana),
      asc(trialApplication.name),
    );

  // 選択後に申込が削除された等。一部だけ送ると管理者の意図とずれるため、何も送らずに選び直してもらう
  if (applications.length !== applicationIds.length) {
    return c.json({ success: false, errors: "選択した申込者が見つかりません。" }, 400);
  }

  // メールアドレスは大文字小文字・前後の空白を区別せずまとめる（同じ家庭が2通受け取らないように）
  const groups = new Map<string, MailGroup>();
  for (const application of applications) {
    const key = application.email.trim().toLowerCase();
    const group = groups.get(key);
    if (group) group.applications.push(application);
    else groups.set(key, { email: application.email.trim(), applications: [application] });
  }

  const sent: Array<Recipient & { sent_at: Date }> = [];
  const failed: Recipient[] = [];
  const skipped: Recipient[] = [];
  let sentMailCount = 0;
  const deadline = Date.now() + SEND_BUDGET_MS;
  for (const [i, group] of [...groups.values()].entries()) {
    // 時間切れの宛先には送らない（最初の1通は必ず試すので、誰にも送らずに終わることはない）
    if (i > 0 && Date.now() + SEND_INTERVAL_MS > deadline) {
      skipped.push(...group.applications);
      continue;
    }
    if (i > 0 && shouldWait()) await wait(SEND_INTERVAL_MS);
    try {
      await sendWithRetry(group.email, { title, body }, deadline);
      // 履歴の sent_at は実際に届いた時刻にする（保存時刻だと全員同じ時刻になってしまう）
      const sentAt = new Date();
      sentMailCount++;
      for (const application of group.applications) sent.push({ ...application, sent_at: sentAt });
    } catch (e) {
      failed.push(...group.applications);
      // 宛先アドレスは個人情報なのでログには出さない。申込IDで追えるようにする
      logAppError("trialNotice.send", e instanceof SendFailedError ? e.cause : e, {
        application_ids: group.applications.map((a) => a.application_id),
        attempts: e instanceof SendFailedError ? e.attempts : MAX_ATTEMPTS,
      });
    }
  }

  // 時間切れで送らなかった宛先も failed として返し、管理画面から再送できるようにする
  if (skipped.length > 0) {
    failed.push(...skipped);
    logAppError(
      "trialNotice.timeBudget",
      new Error("送信時間の上限に達したため残りを送信しませんでした"),
      { application_ids: skipped.map((a) => a.application_id), budget_ms: SEND_BUDGET_MS },
    );
  }

  if (sent.length === 0) {
    return c.json(
      {
        success: false,
        errors: "送信に失敗しました。時間をおいて再送してください。",
        data: { notice: null, sent: [], failed },
      },
      502,
    );
  }

  // 送信が終わってから、届いた宛先だけを連絡と一緒に保存する（片方だけ残らないようトランザクションで）
  const notice = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(trialNotice)
      .values({ title, body, recipient_count: sentMailCount, admin_id: user.id })
      .returning();
    const row = inserted[0];
    if (!row) throw new Error("体験申込者への連絡の保存に失敗しました。");

    await tx.insert(trialNoticeRecipient).values(
      sent.map((r) => ({
        notice_id: row.id,
        trial_application_id: r.application_id,
        name: r.name,
        email: r.email,
        trial_date: r.trial_date,
        sent_at: r.sent_at,
      })),
    );
    return row;
  });

  // 件数はメールの通数で数える（同じアドレスの申込をまとめた後の数。recipient_count と揃える）
  const totalMailCount = groups.size;
  const failedMailCount = totalMailCount - sentMailCount;
  const message =
    failedMailCount === 0
      ? `${sentMailCount}件送信しました。`
      : `${totalMailCount}件中${failedMailCount}件の送信に失敗しました。失敗した方に再送してください。`;

  return c.json(
    {
      success: true,
      message,
      data: {
        notice,
        sent: sent.map(({ sent_at: _sentAt, ...r }) => r),
        failed,
      },
    },
    200,
  );
}
