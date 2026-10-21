// GET /api/notices/:id/reads — 既読状況（admin 以上）
//
// 「誰が読んだか」より「誰がまだ読んでいないか」が運用上の主目的なので、
// 既読者・未読者の両方を返す。対象は削除済みを除く全ユーザー（owner/admin/member）。

import { eq, and } from "../index.js";
import { isNull } from "drizzle-orm";
import { db, news, newsReads, admin } from "../shared/index.js";
import type { Context } from "hono";

export async function getReadStatus(c: Context) {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const existing = await db.select().from(news).where(eq(news.id, id));
  if (existing.length === 0 || existing[0]?.type !== "notice") {
    return c.json({ success: false, errors: "お知らせが見つかりません。" }, 404);
  }

  const users = await db
    .select({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      read_at: newsReads.read_at,
    })
    .from(admin)
    .leftJoin(
      newsReads,
      and(eq(newsReads.user_id, admin.id), eq(newsReads.news_id, id)),
    )
    .where(isNull(admin.deleted_at))
    .orderBy(admin.created_at);

  const read = users.filter((u) => u.read_at !== null);
  const unread = users
    .filter((u) => u.read_at === null)
    .map(({ read_at: _read_at, ...rest }) => rest);

  return c.json(
    {
      success: true,
      data: {
        total: users.length,
        read_count: read.length,
        unread_count: unread.length,
        read,
        unread,
      },
    },
    200,
  );
}
