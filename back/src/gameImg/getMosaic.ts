// GET /api/gameImg/images/:imageId/mosaic — 適用中のモザイク領域と原本を取得（管理者のみ）
// モザイク編集画面が「原本の上に現在の領域を並べて表示する」ために使う

import { getPresignedDownloadUrl } from "../shared/index.js";
import { findGameImage } from "./gameImageRecord.js";
import { mosaicSourceKey } from "./applyMosaic.js";
import type { Context } from "hono";

export const getMosaic = async (c: Context) => {
  const found = await findGameImage(c);
  if (!found.ok) return found.response;
  const image = found.image;

  const [url, originalUrl] = await Promise.all([
    getPresignedDownloadUrl(image.path),
    getPresignedDownloadUrl(mosaicSourceKey(image)),
  ]);

  return c.json(
    {
      success: true,
      data: {
        id: image.id,
        // 公開中の画像（モザイク適用中は適用後の画像）
        url,
        // 編集のベースになる原本
        original_url: originalUrl,
        has_mosaic: image.original_path !== null,
        mosaic_regions: image.mosaic_regions ?? [],
      },
    },
    200,
  );
};
