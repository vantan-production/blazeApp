// モザイクのピクセル化そのもの（pixelateRegion）の単体テスト
// 単色の画像ではピクセル化しても見た目が変わらず、モザイクがかかっていなくても気づけないため、
// グラデーション画像で「ブロック状になっているか」を確かめる
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { pixelateRegion } from "../gameImg/applyMosaic.js";

const SIZE = 60;

/** 左上から右下へ色が変わる 60×60 のグラデーション画像（隣り合う画素はすべて色が違う） */
async function gradientPng(): Promise<Buffer> {
  const raw = Buffer.alloc(SIZE * SIZE * 3);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 3;
      raw[i] = x * 4;
      raw[i + 1] = y * 4;
      raw[i + 2] = 128;
    }
  }
  return sharp(raw, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .png()
    .toBuffer();
}

/** 画像の各画素を "r,g,b" の文字列にした二次元配列 */
async function pixels(image: Buffer): Promise<string[][]> {
  const { data, info } = await sharp(image)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rows: string[][] = [];
  for (let y = 0; y < info.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      row.push(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
    rows.push(row);
  }
  return rows;
}

describe("pixelateRegion", () => {
  it("領域と同じ大きさで、pixel_size 四方のブロックごとに同じ色になる", async () => {
    const source = await gradientPng();
    const region = { x: 10, y: 10, width: 40, height: 40, pixel_size: 10 };

    const result = await pixels(await pixelateRegion(source, region));

    expect(result).toHaveLength(40);
    expect(result[0]).toHaveLength(40);
    // 40px ÷ 10px = 4×4 マス。各マスの中はすべて左上の画素と同じ色
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        const blockTopLeft = result[y - (y % 10)]![x - (x % 10)];
        expect(result[y]![x]).toBe(blockTopLeft);
      }
    }
    expect(new Set(result.flat()).size).toBe(16);
  });

  it("元の領域とは違う画像になる（1つのパイプラインで resize を重ねて素通りしない）", async () => {
    const source = await gradientPng();
    const region = { x: 0, y: 0, width: 30, height: 30, pixel_size: 15 };

    const pixelated = await pixels(await pixelateRegion(source, region));
    const original = await pixels(
      await sharp(source).extract({ left: 0, top: 0, width: 30, height: 30 }).toBuffer(),
    );

    expect(pixelated).not.toEqual(original);
    // 元は 900 画素すべて違う色、ピクセル化後は 2×2 マスの4色
    expect(new Set(original.flat()).size).toBe(900);
    expect(new Set(pixelated.flat()).size).toBe(4);
  });
});
