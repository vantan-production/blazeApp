// GET /api/news-post/:id（または /api/media/:id） — 1件取得

import { eq } from "../index.js";
import { getTableColumns } from "drizzle-orm";
import {
  db,
  news,
  admin,
  images,
  toMediaUrl,
  getRelatedMediaUrls,
  getOptionalUser,
  isMemberOrAbove,
} from "../shared/index.js";
import type { Context } from "hono";
import type { NewsType } from "./handlers.js";

export function createGetById(type: NewsType, label: string) {
  return async (c: Context) => {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

    const result = await db
      .select({
        ...getTableColumns(news),
        admin_name: admin.name,
      })
      .from(news)
      .leftJoin(admin, eq(news.admin_id, admin.id))
      .where(eq(news.id, id));

    const item = result[0];

    if (!item || item.type !== type) {
      return c.json({ success: false, errors: `${label}が見つかりません。` }, 404);
    }

    // 未ログインに関係者限定記事を返さない。存在を明かさないため 403 ではなく 404 にする
    if (item.visibility === "member") {
      const viewer = await getOptionalUser(c);
      if (!isMemberOrAbove(viewer)) {
        return c.json({ success: false, errors: `${label}が見つかりません。` }, 404);
      }
    }

    return c.json(
      {
        success: true,
        data: {
          ...item,
          admin_name: item.admin_name ?? "元管理者",
          img_url: await toMediaUrl(item.img),
          images: await getRelatedMediaUrls(images, images.news_id, id),
        },
      },
      200,
    );
  };
}
