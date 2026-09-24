// GET /api/trial-notices/:id — 体験申込者への連絡の詳細と、送信できた宛先（admin 以上）

import { getTableColumns } from "drizzle-orm";
import type { Context } from "hono";
import { asc, eq, z } from "../index.js";
import { admin, db, trialNotice, trialNoticeRecipient } from "../shared/index.js";

// uuid 型の列に形式外の文字列を渡すと Postgres が例外を投げ 500 になるため、先に形だけ検証する
const idSchema = z.guid();

const NOT_FOUND = "連絡が見つかりません。";

export async function getById(c: Context) {
  const parsed = idSchema.safeParse(c.req.param("id"));
  if (!parsed.success) return c.json({ success: false, errors: NOT_FOUND }, 404);
  const id = parsed.data;

  const rows = await db
    .select({ ...getTableColumns(trialNotice), admin_name: admin.name })
    .from(trialNotice)
    .leftJoin(admin, eq(trialNotice.admin_id, admin.id))
    .where(eq(trialNotice.id, id));
  const notice = rows[0];
  if (!notice) return c.json({ success: false, errors: NOT_FOUND }, 404);

  const recipients = await db
    .select({
      application_id: trialNoticeRecipient.trial_application_id,
      name: trialNoticeRecipient.name,
      email: trialNoticeRecipient.email,
      trial_date: trialNoticeRecipient.trial_date,
      sent_at: trialNoticeRecipient.sent_at,
    })
    .from(trialNoticeRecipient)
    .where(eq(trialNoticeRecipient.notice_id, id))
    .orderBy(asc(trialNoticeRecipient.sent_at), asc(trialNoticeRecipient.id));

  return c.json(
    {
      success: true,
      data: { ...notice, admin_name: notice.admin_name ?? "元管理者", recipients },
    },
    200,
  );
}
