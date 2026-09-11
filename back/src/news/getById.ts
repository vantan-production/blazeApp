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

    // 公開範囲・公開状態のどちらも、条件を満たさない相手には存在を明かさず 404 にする
    const needsViewerCheck = item.visibility === "member" || item.status !== "published";
    if (needsViewerCheck) {
      const viewer = await getOptionalUser(c);
      const isAdmin = viewer?.role === "owner" || viewer?.role === "admin";

      if (item.visibility === "member" && !isMemberOrAbove(viewer)) {
        return c.json({ success: false, errors: `${label}が見つかりません。` }, 404);
      }

      // 承認待ち・下書きは admin 以上か、投稿した本人だけが見られる
      if (item.status !== "published" && !isAdmin && viewer?.id !== item.admin_id) {
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
