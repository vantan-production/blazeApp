// DELETE /api/gameImg/images/:imageId/mosaic — モザイクを解除して原本に戻す（管理者のみ）
//
// 公開用のキー（images.path）は変えずに中身を原本で上書きし、退避していた originals/ を消す。
// path を originals/ 側へ付け替えると、次にモザイクをかけたとき退避先と公開用が
// 同じキーを指しうるため、キーの役割は固定したままにする。

import { eq } from "../index.js";
import {
  db,
  images,
  deleteFromS3,
  downloadFromS3,
  uploadToS3,
  getPresignedDownloadUrl,
} from "../shared/index.js";
import { findGameImage } from "./gameImageRecord.js";
import type { Context } from "hono";

export const removeMosaic = async (c: Context) => {
  const found = await findGameImage(c);
  if (!found.ok) return found.response;
  const image = found.image;

  const originalKey = image.original_path;
  if (!originalKey) {
    return c.json(
      { success: false, errors: "この画像にモザイクは適用されていません。" },
      400,
    );
  }

  try {
    const originalBuffer = await downloadFromS3(originalKey);
    await uploadToS3(originalBuffer, image.path, "image/webp");
  } catch (e) {
    console.error("[removeMosaic] 原本の復元に失敗:", e);
    return c.json(
      { success: false, errors: "画像の処理中にエラーが発生しました。" },
      500,
    );
  }

  await db
    .update(images)
    .set({ original_path: null, mosaic_regions: null })
    .where(eq(images.id, image.id));

  // 公開用が原本に戻った後なので、退避分の削除に失敗しても配信には影響しない
  await deleteFromS3(originalKey).catch((e) =>
    console.error("[removeMosaic] 退避した原本の削除に失敗:", e),
  );

  const url = await getPresignedDownloadUrl(image.path);

  return c.json(
    {
      success: true,
      message: "モザイクを解除しました。",
      data: { id: image.id, url, mosaic_regions: null },
    },
    200,
  );
};
