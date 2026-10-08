import { z } from "../index.js";
import {
  db,
  achievement,
  images,
  deleteFromS3,
  validateMultipleFiles,
  titleSchema,
  bodySchema,
  processImageUpload,
  processVideoUpload,
  processFileUpload,
} from "../shared/index.js";

import type { Context } from "hono";

export const create = async (c: Context) => {
  // admin_idから管理者のみを取得
  const user = c.get("user") as { id: string };
  // 普段jsonでデータを取得する時はjsonファイルでしか取得できないがparseBodyを使うことで画像やファイルなども取得することができる
  // 本文の画像（images）は複数枚送られるため all: true で配列として受け取る
  const body = await c.req.parseBody({ all: true });

  // スキーマ定義
  const schema = z.object({
    title: titleSchema,
    body: bodySchema,
  });

  // スキーマ検証
  const result = schema.safeParse({
    title: body["title"],
    body: body["body"],
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
  const tempId = crypto.randomUUID();
  const s3Prefix = `achievement/${tempId}`;

  // 単一項目は同名で複数送られても先頭だけ使う
  const firstFile = (value: unknown): File | undefined => {
    const v = Array.isArray(value) ? value[0] : value;
    return v instanceof File ? v : undefined;
  };
  const bodyImagesInput = body["images"];
  const bodyImageFiles: File[] = (
    Array.isArray(bodyImagesInput) ? bodyImagesInput : [bodyImagesInput]
  ).filter((i): i is File => i instanceof File);

  // 本文の画像の枚数・合計サイズを、変換を始める前にまとめて判定する
  if (bodyImageFiles.length > 0) {
    const sizeError = validateMultipleFiles(bodyImageFiles);
    if (sizeError) return c.json({ success: false, errors: sizeError }, 400);
  }

  // 途中で失敗したら、それまでに上げたオブジェクトを S3 から消す（画像が一部だけ欠けた投稿を残さない）
  const uploadedKeys: string[] = [];
  const rollbackUploads = async (): Promise<void> => {
    await Promise.allSettled(uploadedKeys.map((key) => deleteFromS3(key)));
  };

  // 画像の処理（任意）
  let imgPath: string | null = null;
  const imageFile = firstFile(body["image"]);

  if (imageFile) {
    const imageResult = await processImageUpload(imageFile, s3Prefix);
    if (!imageResult.success) {
      return c.json(
        { success: false, errors: imageResult.error },
        imageResult.status,
      );
    }
    imgPath = imageResult.path;
    uploadedKeys.push(imageResult.path);
  }

  // 動画の処理（任意）
  let moviePath: string | null = null;
  const movieFile = firstFile(body["movie"]);

  if (movieFile) {
    const videoResult = await processVideoUpload(movieFile, s3Prefix);
    if (!videoResult.success) {
      await rollbackUploads();
      return c.json(
        { success: false, errors: videoResult.error },
        videoResult.status,
      );
    }
    moviePath = videoResult.path;
    uploadedKeys.push(videoResult.path);
  }

  // ファイルの処理（任意）
  let filePath: string | null = null;
  const fileUpload = firstFile(body["file"]);

  if (fileUpload) {
    const fileResult = await processFileUpload(fileUpload, `${s3Prefix}/files`);
    if (!fileResult.success) {
      await rollbackUploads();
      return c.json(
        { success: false, errors: fileResult.error },
        fileResult.status,
      );
    }
    filePath = fileResult.path;
    uploadedKeys.push(fileResult.path);
  }

  // 本文の画像（任意・複数）。S3キーは Date.now() で決まるため、同じミリ秒でも衝突しないよう1枚ずつ階層を分ける
  const bodyImagePaths: string[] = [];
  for (const [index, file] of bodyImageFiles.entries()) {
    const imageResult = await processImageUpload(file, `${s3Prefix}/body/${index}`);
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

  // dbに新しい実績を保存する。実績本体と本文の画像は必ず揃って入る
  let inserted: (typeof achievement.$inferSelect)[];
  try {
    inserted = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(achievement)
        .values({
          title,
          body: bodyText,
          img: imgPath,
          movie: moviePath,
          file: filePath,
          admin_id: user.id,
        })
        .returning();

      const achievementId = rows[0]?.id;
      if (achievementId && bodyImagePaths.length > 0) {
        await tx
          .insert(images)
          .values(bodyImagePaths.map((path) => ({ path, achievement_id: achievementId })));
      }
      return rows;
    });
  } catch (err) {
    await rollbackUploads();
    throw err;
  }

  // フロントに「実績を投稿しました。」という文章で返す
  return c.json(
    {
      success: true,
      message: "実績を投稿しました。",
      data: inserted[0],
    },
    200,
  );
};
