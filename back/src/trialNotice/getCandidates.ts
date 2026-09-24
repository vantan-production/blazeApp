// GET /api/trial-notices/candidates — 送信先に選べる体験申込者の一覧（admin 以上）
//
// 宛先は管理者が画面で選ぶため、ここでは候補を返すだけ。
// - trial_date 指定あり: その体験日の申込者
// - 指定なし: 今日（JST）以降に体験予定の申込者
// 小規模運用で件数が少ないため、ページネーションせず全件返す（画面でまとめて選べるように）。

import { gte } from "drizzle-orm";
import type { Context } from "hono";
import { asc, eq } from "../index.js";
import { db, trialApplication, trialDateSchema } from "../shared/index.js";
import { todayInJst } from "./jst.js";

export async function getCandidates(c: Context) {
  const raw = c.req.query("trial_date");

  let trialDate: string | undefined;
  if (raw) {
    const parsed = trialDateSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          errors: parsed.error.issues.map((issue) => ({
            field: "trial_date",
            message: issue.message,
          })),
        },
        400,
      );
    }
    trialDate = parsed.data;
  }

  const data = await db
    .select({
      id: trialApplication.id,
      name: trialApplication.name,
      furigana: trialApplication.furigana,
      email: trialApplication.email,
      trial_date: trialApplication.trial_date,
      created_at: trialApplication.created_at,
    })
    .from(trialApplication)
    .where(
      trialDate
        ? eq(trialApplication.trial_date, trialDate)
        : gte(trialApplication.trial_date, todayInJst()),
    )
    .orderBy(
      asc(trialApplication.trial_date),
      asc(trialApplication.furigana),
      asc(trialApplication.name),
    );

  return c.json({ success: true, data }, 200);
}
