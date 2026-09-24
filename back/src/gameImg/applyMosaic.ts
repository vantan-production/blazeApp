// POST /api/gameImg/images/:imageId/mosaic — 指定領域にモザイクを適用・再編集（管理者のみ）
// 管理者がピクセル座標の領域一覧を送信すると、原本にその領域をピクセル化して公開用画像を差し替える。
//
// 適用前に原本を originals/ 配下へ退避する（初回のみ）。
// 以前は同じS3キーに上書きしていたため原本が失われ、モザイクのやり直しも
// member への原本配布もできなかった（docs/role-design.md §5-2）。
//
// 適用中の領域は images.mosaic_regions に保存する。リクエストのたびに
// 「原本 + 送られてきた領域一覧」で作り直すため、領域の追加・移動・削除・粗さ変更を
// 何度でもやり直せる（一覧は全置き換え。解除は DELETE を使う）。

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
import { findGameImage } from "./gameImageRecord.js";
import {
  mosaicRequestSchema,
  normalizeMosaicRegions,
  findOutOfBoundsRegion,
  computeMosaicScale,
  MAX_MOSAIC_REGIONS,
} from "./mosaicLogic.js";
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
  const found = await findGameImage(c);
  if (!found.ok) return found.response;
  const image = found.image;
  const imageId = image.id;

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const parsed = mosaicRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        errors: `x, y, width, height を0以上の整数で指定してください（複数指定は regions 配列で最大${MAX_MOSAIC_REGIONS}件）。`,
      },
      400,
    );
  }

  const regions = normalizeMosaicRegions(parsed.data);
  const s3Key = image.path;
  const sourceKey = mosaicSourceKey(image);

  try {
    // S3から原本をダウンロード
    const originalBuffer = await downloadFromS3(sourceKey);

    // 画像サイズを取得して全領域が範囲内か確認
    const metadata = await sharp(originalBuffer).metadata();
    const imgWidth = metadata.width ?? 0;
    const imgHeight = metadata.height ?? 0;

    if (findOutOfBoundsRegion(regions, imgWidth, imgHeight)) {
      return c.json(
        {
          success: false,
          errors: `指定領域が画像サイズ（${imgWidth}×${imgHeight}px）を超えています。`,
        },
        400,
      );
    }

    // 各領域をピクセル化（スケールダウン → ニアレストネイバーでスケールアップ）
    const overlays = await Promise.all(
      regions.map(async (region) => {
        const { smallW, smallH } = computeMosaicScale(
          region.width,
          region.height,
          region.pixel_size,
        );
        const input = await sharp(originalBuffer)
          .extract({ left: region.x, top: region.y, width: region.width, height: region.height })
          .resize(smallW, smallH, { fit: "fill" })
          .resize(region.width, region.height, { fit: "fill", kernel: "nearest" })
          .toBuffer();
        return { input, left: region.x, top: region.y };
      }),
    );

    // 全モザイク領域を原本に合成して WebP で書き出し
    const result = await sharp(originalBuffer)
      .composite(overlays)
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

  // 公開用画像の差し替えが済んでから領域を記録する（途中で失敗したら前の領域のまま）
  await db
    .update(images)
    .set({ mosaic_regions: regions })
    .where(eq(images.id, imageId));

  const updatedUrl = await getPresignedDownloadUrl(s3Key);

  return c.json(
    {
      success: true,
      message: "モザイクを適用しました。",
      data: { id: imageId, url: updatedUrl, mosaic_regions: regions },
    },
    200,
  );
};
