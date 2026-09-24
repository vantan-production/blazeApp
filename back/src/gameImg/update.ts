// PATCH /api/gameImg/:id/:imageId — 試合風景の画像を差し替え（管理者のみ）

import { eq } from "../index.js";
import { db, game, images, deleteFromS3, replaceMediaOnS3 } from "../shared/index.js";
import type { Context } from "hono";

export const update = async (c: Context) => {
  const gameId = c.req.param("id");
  const imageId = c.req.param("imageId");
  if (!gameId || !imageId) {
    return c.json({ success: false, errors: "IDが指定されていません。" }, 400);
  }

  // 試合風景の存在確認
  const existingGame = await db.select().from(game).where(eq(game.id, gameId));
  if (existingGame.length === 0) {
    return c.json({ success: false, errors: "試合風景が見つかりません。" }, 404);
  }

  // 対象画像の存在確認
  const existingImage = await db.select().from(images).where(eq(images.id, imageId));
  if (existingImage.length === 0) {
    return c.json({ success: false, errors: "画像が見つかりません。" }, 404);
  }

  const body = await c.req.parseBody();
  const imageFile = body["image"];

  if (!imageFile || !(imageFile instanceof File)) {
    return c.json({ success: false, errors: "新しい画像を指定してください。" }, 400);
  }

  // 古い画像をS3から削除し、新しい画像をバリデーション・圧縮してアップロード
  const imageResult = await replaceMediaOnS3(
    existingImage[0]!.path,
    imageFile,
    `game/${gameId}`,
    "image",
  );
  if (!imageResult.success) {
    return c.json(
      { success: false, errors: imageResult.error },
      imageResult.status,
    );
  }

  // 差し替え前の画像にモザイクをかけていた場合、退避していた原本も破棄する。
  // 残すと member に古い原本が配られ、次のモザイクも古い原本を起点にしてしまう
  const previousOriginalPath = existingImage[0]!.original_path;
  if (previousOriginalPath) await deleteFromS3(previousOriginalPath);

  // imagesテーブルのパスを更新（新しい画像はモザイク未適用の状態に戻す）
  const updated = await db
    .update(images)
    .set({ path: imageResult.path, original_path: null, mosaic_regions: null })
    .where(eq(images.id, imageId))
    .returning();

  return c.json({ success: true, message: "画像を差し替えました。", data: updated[0] }, 200);
};
