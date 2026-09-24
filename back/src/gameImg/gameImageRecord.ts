// モザイク系エンドポイント共通：対象画像の取得と「試合風景の画像か」の確認

import { eq } from "../index.js";
import { db, images } from "../shared/index.js";
import type { Context } from "hono";

type ImageRecord = typeof images.$inferSelect;

type FindResult = { ok: true; image: ImageRecord } | { ok: false; response: Response };

// :imageId の画像を取得する。存在しない・試合風景以外の画像ならエラーレスポンスを返す
export async function findGameImage(c: Context): Promise<FindResult> {
  const imageId = c.req.param("imageId");
  if (!imageId) {
    return {
      ok: false,
      response: c.json({ success: false, errors: "IDが指定されていません。" }, 400),
    };
  }

  const existing = await db.select().from(images).where(eq(images.id, imageId));
  const image = existing[0];
  if (!image) {
    return {
      ok: false,
      response: c.json({ success: false, errors: "画像が見つかりません。" }, 404),
    };
  }

  if (!image.game_id) {
    return {
      ok: false,
      response: c.json(
        { success: false, errors: "試合風景の画像のみモザイクを適用できます。" },
        400,
      ),
    };
  }

  return { ok: true, image };
}
