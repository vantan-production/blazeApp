// GET /api/news-post（または /api/media） — 一覧取得

import { eq, desc, and } from "../index.js";
import { count, getTableColumns } from "drizzle-orm";
import {
  db,
  news,
  admin,
  toMediaUrl,
  parsePage,
  buildPagination,
  getOptionalUser,
  isMemberOrAbove,
} from "../shared/index.js";
import type { Context } from "hono";
import type { NewsType } from "./handlers.js";

export function createGetAll(type: NewsType) {
  return async (c: Context) => {
    const { page, limit, offset } = parsePage(c);

    // 未ログインには visibility='member' の記事を出さない。
    // 認証必須のルートではないため getOptionalUser で閲覧者を判定する。
    const viewer = await getOptionalUser(c);
    const filter = isMemberOrAbove(viewer)
      ? eq(news.type, type)
      : and(eq(news.type, type), eq(news.visibility, "public"));

    const [all, totalResult] = await Promise.all([
      db
        .select({
          ...getTableColumns(news),
          admin_name: admin.name,
        })
        .from(news)
        .leftJoin(admin, eq(news.admin_id, admin.id))
        .where(filter)
        .orderBy(desc(news.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(news).where(filter),
    ]);
    const total = Number(totalResult[0]?.total ?? 0);

    const withUrls = await Promise.all(
      all.map(async (item) => ({
        ...item,
        admin_name: item.admin_name ?? "元管理者",
        img_url: await toMediaUrl(item.img),
      })),
    );

    return c.json(
      {
        success: true,
        data: withUrls,
        pagination: buildPagination(page, limit, total),
      },
      200,
    );
  };
}
