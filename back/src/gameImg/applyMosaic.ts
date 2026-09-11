// POST /api/gameImg/images/:imageId/mosaic — 指定領域にモザイクを適用（管理者のみ）
// 管理者が x, y, width, height (ピクセル座標) を送信すると、その領域をピクセル化して公開用画像を差し替える。
//
// 適用前に原本を originals/ 配下へ退避する（初回のみ）。
// 以前は同じS3キーに上書きしていたため原本が失われ、モザイクのやり直しも
// member への原本配布もできなかった（docs/role-design.md §5-2）。

import sharp from "sharp";
import { eq } from "../index.js";
import {
  db,
  images,
  downloadFromS3,
  uploadToS3,
  getPresignedDownloadUrl,
  generateS3Key,
} from "../shared/index.js";
import { mosaicSchema, isWithinImageBounds, computeMosaicScale } from "./mosaicLogic.js";
import type { Context } from "hono";

/**
 * モザイクの入力にするS3キーを決める。
 * 退避済みの原本があればそれを使う。公開用画像を起点にすると
 * モザイクの上にモザイクが重なり、元に戻せなくなるため。
 */
export const mosaicSourceKey = (image: {
  path: string;
  original_path: string | null;
}): string => image.original_path ?? image.path;

export const applyMosaic = async (c: Context) => {
  const imageId = c.req.param("imageId");
  if (!imageId) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const existing = await db.select().from(images).where(eq(images.id, imageId));
  if (existing.length === 0) {
    return c.json({ success: false, errors: "画像が見つかりません。" }, 404);
  }

  if (!existing[0]!.game_id) {
    return c.json(
      { success: false, errors: "試合風景の画像のみモザイクを適用できます。" },
      400,
    );
  }

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const parsed = mosaicSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        errors: "x, y, width, height を0以上の整数で指定してください。",
      },
      400,
    );
  }

  const { x, y, width, height } = parsed.data;
  const image = existing[0]!;
  const s3Key = image.path;

  const sourceKey = mosaicSourceKey(image);

  try {
    // S3から元画像をダウンロード
    const originalBuffer = await downloadFromS3(sourceKey);

    // 画像サイズを取得して座標が範囲内か確認
    const metadata = await sharp(originalBuffer).metadata();
    const imgWidth = metadata.width ?? 0;
    const imgHeight = metadata.height ?? 0;

    if (!isWithinImageBounds({ x, y, width, height }, imgWidth, imgHeight)) {
      return c.json(
        {
          success: false,
          errors: `指定領域が画像サイズ（${imgWidth}×${imgHeight}px）を超えています。`,
        },
        400,
      );
    }

    // 指定領域をピクセル化（スケールダウン → ニアレストネイバーでスケールアップ）
    const PIXEL_SIZE = 15;
    const { smallW, smallH } = computeMosaicScale(width, height, PIXEL_SIZE);

    const mosaicRegion = await sharp(originalBuffer)
      .extract({ left: x, top: y, width, height })
      .resize(smallW, smallH, { fit: "fill" })
      .resize(width, height, { fit: "fill", kernel: "nearest" })
      .toBuffer();

    // モザイク領域を元画像に合成して WebP で書き出し
    const result = await sharp(originalBuffer)
      .composite([{ input: mosaicRegion, left: x, top: y }])
      .webp({ quality: 80 })
      .toBuffer();

    // 初回のモザイク適用時だけ、原本を別キーへ退避する
    if (!image.original_path) {
      const originalKey = generateS3Key("originals", imageId, "original.webp");
      await uploadToS3(originalBuffer, originalKey, "image/webp");
      await db
        .update(images)
        .set({ original_path: originalKey })
        .where(eq(images.id, imageId));
    }

    // 公開用画像を差し替える（原本は originals/ 側に残る）
    await uploadToS3(result, s3Key, "image/webp");
  } catch (e) {
    console.error("[applyMosaic] 画像処理に失敗:", e);
    return c.json(
      { success: false, errors: "画像の処理中にエラーが発生しました。" },
      500,
    );
  }

  const updatedUrl = await getPresignedDownloadUrl(s3Key);

  return c.json(
    {
      success: true,
      message: "モザイクを適用しました。",
      data: { id: imageId, url: updatedUrl },
    },
    200,
  );
};
