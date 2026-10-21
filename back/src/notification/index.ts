// 通知設定 API とメール通知の送信
//
// GET   /api/notification-settings — 自分の通知設定（member 以上）
// PATCH /api/notification-settings — 通知設定の変更（member 以上）
//
// 設定行が無いユーザーは既定（どちらも受け取る）として扱う。
// 全員分の行をあらかじめ作らずに済むよう、変更時に初めて行を作る。

import { Hono } from "hono";
import { eq, z } from "../index.js";
import { isNull, and, or } from "drizzle-orm";
import {
  db,
  admin,
  notificationSettings,
  authToken,
  sendNoticeNotificationEmail,
  sendSurveyNotificationEmail,
} from "../shared/index.js";
import { requireMember } from "../db/roleGuard.js";
import type { Context } from "hono";

const app = new Hono();

const DEFAULT_SETTINGS = { notice_email: true, survey_email: true };

const updateSchema = z
  .object({
    notice_email: z.boolean().optional(),
    survey_email: z.boolean().optional(),
  })
  .refine(
    (v) => v.notice_email !== undefined || v.survey_email !== undefined,
    "変更する項目を指定してください。",
  );

// GET /api/notification-settings
async function getSettings(c: Context) {
  const user = c.get("user") as { id: string };

  const rows = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.user_id, user.id));

  const row = rows[0];

  return c.json(
    {
      success: true,
      data: {
        notice_email: row?.notice_email ?? DEFAULT_SETTINGS.notice_email,
        survey_email: row?.survey_email ?? DEFAULT_SETTINGS.survey_email,
      },
    },
    200,
  );
}

// PATCH /api/notification-settings
async function updateSettings(c: Context) {
  const user = c.get("user") as { id: string };

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, errors: "リクエストのJSON形式が不正です" }, 400);
  }

  const result = updateSchema.safeParse(body);
  if (!result.success) {
    return c.json(
      {
        success: false,
        errors: result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      400,
    );
  }

  const next = { ...DEFAULT_SETTINGS, ...result.data };

  const saved = await db
    .insert(notificationSettings)
    .values({ user_id: user.id, ...next })
    .onConflictDoUpdate({
      target: notificationSettings.user_id,
      set: result.data,
    })
    .returning();

  return c.json(
    {
      success: true,
      message: "通知設定を更新しました。",
      data: {
        notice_email: saved[0]?.notice_email ?? next.notice_email,
        survey_email: saved[0]?.survey_email ?? next.survey_email,
      },
    },
    200,
  );
}

app.get("/api/notification-settings", authToken, requireMember, (c) => getSettings(c));
app.patch("/api/notification-settings", authToken, requireMember, (c) =>
  updateSettings(c),
);

export default app;

// ---------------------------------------------------------------------------
// 通知の送信
// ---------------------------------------------------------------------------

type NotificationKind = "notice" | "survey";

/**
 * 通知を受け取る設定のユーザーのメールアドレスを集める。
 * 設定行が無いユーザーも既定で受け取る対象に含める。
 */
async function recipientsFor(kind: NotificationKind): Promise<string[]> {
  const column =
    kind === "notice"
      ? notificationSettings.notice_email
      : notificationSettings.survey_email;

  const rows = await db
    .select({ email: admin.email })
    .from(admin)
    .leftJoin(notificationSettings, eq(notificationSettings.user_id, admin.id))
    .where(
      and(
        isNull(admin.deleted_at),
        // 設定行が無い＝既定で受け取る
        or(isNull(notificationSettings.id), eq(column, true)),
      ),
    );

  return rows.map((r) => r.email);
}

/**
 * 新しいお知らせ／アンケートを関係者にメールで知らせる。
 *
 * 投稿処理からは待たずに呼ぶ（await しない）。通知が失敗しても投稿自体は成功させ、
 * ログだけ残して後追いできるようにする方針のため（設計書 §10 G）。
 */
export function notifyMembers(
  kind: NotificationKind,
  title: string,
): void {
  void (async () => {
    try {
      const recipients = await recipientsFor(kind);
      if (recipients.length === 0) return;

      await (kind === "notice"
        ? sendNoticeNotificationEmail(recipients, title)
        : sendSurveyNotificationEmail(recipients, title));
    } catch (e) {
      console.error(`[notification] ${kind} の通知メール送信に失敗:`, e);
    }
  })();
}
