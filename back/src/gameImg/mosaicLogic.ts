// モザイク適用処理のうち、S3・DB・sharp などのI/Oを伴わない純粋なロジック部分

import { z } from "zod";
import type { MosaicRegionRecord } from "../db/schema.js";

// モザイクの粗さ（1マスあたりのピクセル数）。指定がなければこの値を使う
export const DEFAULT_PIXEL_SIZE = 15;
// 粗さの指定可能範囲（小さすぎると効果がなく、大きすぎると領域全体が単色になる）
export const MIN_PIXEL_SIZE = 2;
export const MAX_PIXEL_SIZE = 100;
// 1枚の画像に適用できる領域数の上限（処理時間とリクエストサイズの上限）
export const MAX_MOSAIC_REGIONS = 20;

// 1領域の定義。pixel_size は任意（省略時は DEFAULT_PIXEL_SIZE）
export const mosaicSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  pixel_size: z.number().int().min(MIN_PIXEL_SIZE).max(MAX_PIXEL_SIZE).optional(),
});

export type MosaicRegion = z.infer<typeof mosaicSchema>;

// リクエストボディ。編集操作は「領域一覧の全置き換え」で表現する
// - { regions: [...] }       … 領域をまとめて指定（追加・移動・削除すべてこの形で行う）
// - { x, y, width, height } … 領域1つだけの従来形式（後方互換）
export const mosaicRequestSchema = z.union([
  z.object({ regions: z.array(mosaicSchema).min(1).max(MAX_MOSAIC_REGIONS) }),
  mosaicSchema,
]);

// リクエストボディを「pixel_size 補完済みの領域配列」に正規化する（DB保存・sharp処理で使う形）
export function normalizeMosaicRegions(
  input: z.infer<typeof mosaicRequestSchema>,
): MosaicRegionRecord[] {
  const regions = "regions" in input ? input.regions : [input];
  return regions.map((region) => ({
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
    pixel_size: region.pixel_size ?? DEFAULT_PIXEL_SIZE,
  }));
}

// 指定領域が画像サイズ内に収まっているか判定
export function isWithinImageBounds(
  region: Pick<MosaicRegion, "x" | "y" | "width" | "height">,
  imgWidth: number,
  imgHeight: number,
): boolean {
  return region.x + region.width <= imgWidth && region.y + region.height <= imgHeight;
}

// 画像からはみ出す最初の領域を返す（すべて収まっていれば null）
export function findOutOfBoundsRegion<
  T extends Pick<MosaicRegion, "x" | "y" | "width" | "height">,
>(regions: T[], imgWidth: number, imgHeight: number): T | null {
  return regions.find((region) => !isWithinImageBounds(region, imgWidth, imgHeight)) ?? null;
}

// ピクセル化のための縮小サイズを計算（縮小後は最低1pxを保証）
export function computeMosaicScale(
  width: number,
  height: number,
  pixelSize: number,
): { smallW: number; smallH: number } {
  return {
    smallW: Math.max(1, Math.round(width / pixelSize)),
    smallH: Math.max(1, Math.round(height / pixelSize)),
  };
}
