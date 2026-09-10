// GET /api/notices — 関係者限定お知らせの一覧（自分の既読フラグ付き）

import { eq, desc, and } from "../index.js";
import { count, getTableColumns } from "drizzle-orm";
import {
  db,
  news,
  newsReads,
  admin,
  toMediaUrl,
  parsePage,
  buildPagination,
} from "../shared/index.js";
import type { Context } from "hono";

export async function getAllNotices(c: Context) {
  const user = c.get("user") as { id: string };
  const { page, limit, offset } = parsePage(c);

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        ...getTableColumns(news),
        admin_name: admin.name,
        // 自分の既読日時。LEFT JOIN なので未読なら null になる
        read_at: newsReads.read_at,
      })
      .from(news)
      .leftJoin(admin, eq(news.admin_id, admin.id))
      .leftJoin(
        newsReads,
        and(eq(newsReads.news_id, news.id), eq(newsReads.user_id, user.id)),
      )
      .where(eq(news.type, "notice"))
      .orderBy(desc(news.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(news).where(eq(news.type, "notice")),
  ]);

  const total = Number(totalResult[0]?.total ?? 0);

  const data = await Promise.all(
    rows.map(async (item) => ({
      ...item,
      admin_name: item.admin_name ?? "元管理者",
      img_url: await toMediaUrl(item.img),
      is_read: item.read_at !== null,
    })),
  );

  return c.json(
    { success: true, data, pagination: buildPagination(page, limit, total) },
    200,
  );
}
