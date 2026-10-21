// POST /api/notices/:id/read — 既読をつける（member 以上）

import { eq, and } from "../index.js";
import { db, news, newsReads } from "../shared/index.js";
import type { Context } from "hono";

export async function markAsRead(c: Context) {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const user = c.get("user") as { id: string };

  const existing = await db.select().from(news).where(eq(news.id, id));
  if (existing.length === 0 || existing[0]?.type !== "notice") {
    return c.json({ success: false, errors: "お知らせが見つかりません。" }, 404);
  }

  // 同じお知らせを何度開いても初回の既読日時を保つ（news_reads_news_user_uniq で重複を防ぐ）
  await db
    .insert(newsReads)
    .values({ news_id: id, user_id: user.id })
    .onConflictDoNothing({ target: [newsReads.news_id, newsReads.user_id] });

  const read = await db
    .select()
    .from(newsReads)
    .where(and(eq(newsReads.news_id, id), eq(newsReads.user_id, user.id)));

  return c.json(
    {
      success: true,
      message: "既読にしました。",
      data: { read_at: read[0]?.read_at ?? null },
    },
    200,
  );
}
