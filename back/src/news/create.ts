// POST /api/news-post（または /api/media） — 新規投稿（管理者のみ）

import { z } from "../index.js";
import {
  db,
  news,
  titleSchema,
  bodySchema,
  categorySchema,
  visibilitySchema,
  processImageUpload,
} from "../shared/index.js";
import type { Context } from "hono";
import type { NewsType } from "./handlers.js";

export function createCreate(type: NewsType, label: string, s3Prefix: string) {
  return async (c: Context) => {
    const user = c.get("user") as { id: string };
    const body = await c.req.parseBody();

    const schema = z.object({
      title: titleSchema,
      body: bodySchema,
      category: categorySchema.optional(),
      visibility: visibilitySchema.optional(),
    });
    const result = schema.safeParse({
      title: body["title"],
      body: body["body"],
      category: body["category"] || undefined,
      visibility: body["visibility"] || undefined,
    });

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

    const title = result.data.title;
    const bodyText = result.data.body;

    // 画像の処理（任意）
    let imgPath: string | null = null;
    const imageFile = body["image"];

    if (imageFile && imageFile instanceof File) {
      const tempId = crypto.randomUUID();
      const imageResult = await processImageUpload(imageFile, `${s3Prefix}/${tempId}`);
      if (!imageResult.success) {
        return c.json({ success: false, errors: imageResult.error }, imageResult.status);
      }
      imgPath = imageResult.path;
    }

    const inserted = await db
      .insert(news)
      .values({
        title,
        body: bodyText,
        img: imgPath,
        type,
        admin_id: user.id,
        category: result.data.category ?? null,
        // 事務連絡は定義上つねに関係者限定。それ以外は指定が無ければ公開
        visibility: type === "notice" ? "member" : (result.data.visibility ?? "public"),
      })
      .returning();

    return c.json({ success: true, message: `${label}を投稿しました。`, data: inserted[0] }, 200);
  };
}
