// POST /api/news-post（または /api/media） — 新規投稿（管理者のみ）

import { z } from "../index.js";
import {
  db,
  news,
  images,
  deleteFromS3,
  validateMultipleFiles,
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
    // 本文の画像（images）は複数枚送られるため all: true で配列として受け取る
    const body = await c.req.parseBody({ all: true });

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

    // 単一項目は同名で複数送られても先頭だけ使う
    const firstFile = (value: unknown): File | undefined => {
      const v = Array.isArray(value) ? value[0] : value;
      return v instanceof File ? v : undefined;
    };
    const imageFile = firstFile(body["image"]);
    const bodyImagesInput = body["images"];
    const bodyImageFiles: File[] = (
      Array.isArray(bodyImagesInput) ? bodyImagesInput : [bodyImagesInput]
    ).filter((i): i is File => i instanceof File);

    // 本文の画像の枚数・合計サイズを、変換を始める前にまとめて判定する
    if (bodyImageFiles.length > 0) {
      const sizeError = validateMultipleFiles(bodyImageFiles);
      if (sizeError) return c.json({ success: false, errors: sizeError }, 400);
    }

    // 変換とアップロードを DB に書く前にすべて終わらせ、途中で失敗したら上げた分を消す
    // （gameImg/create.ts と同じ方針。画像が一部だけ欠けた投稿を残さない）
    const tempId = crypto.randomUUID();
    const uploadedKeys: string[] = [];
    const rollbackUploads = async (): Promise<void> => {
      await Promise.allSettled(uploadedKeys.map((key) => deleteFromS3(key)));
    };

    // サムネイル画像（任意）
    let imgPath: string | null = null;
    if (imageFile) {
      const imageResult = await processImageUpload(imageFile, `${s3Prefix}/${tempId}`);
      if (!imageResult.success) {
        return c.json({ success: false, errors: imageResult.error }, imageResult.status);
      }
      imgPath = imageResult.path;
      uploadedKeys.push(imageResult.path);
    }

    // 本文の画像（任意・複数）。S3キーは Date.now() で決まるため、同じミリ秒でも衝突しないよう1枚ずつ階層を分ける
    const bodyImagePaths: string[] = [];
    for (const [index, file] of bodyImageFiles.entries()) {
      const imageResult = await processImageUpload(
        file,
        `${s3Prefix}/${tempId}/body/${index}`,
      );
      if (!imageResult.success) {
        await rollbackUploads();
        return c.json(
          { success: false, errors: `「${file.name}」: ${imageResult.error}` },
          imageResult.status,
        );
      }
      bodyImagePaths.push(imageResult.path);
      uploadedKeys.push(imageResult.path);
    }

    let inserted: (typeof news.$inferSelect)[];
    try {
      // 投稿本体と本文の画像は必ず揃って入る
      inserted = await db.transaction(async (tx) => {
        const rows = await tx
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

        const newsId = rows[0]?.id;
        if (newsId && bodyImagePaths.length > 0) {
          await tx
            .insert(images)
            .values(bodyImagePaths.map((path) => ({ path, news_id: newsId })));
        }
        return rows;
      });
    } catch (err) {
      await rollbackUploads();
      throw err;
    }

    return c.json({ success: true, message: `${label}を投稿しました。`, data: inserted[0] }, 200);
  };
}
