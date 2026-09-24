// モザイクの再編集（複数領域・領域の保存・取得・解除）と、画像差し替え時の原本の後始末
// S3への実アクセスはsetupFiles(s3Mock.setup.ts)でグローバルにモックされている
import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { cleanDb, testDb } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";
import { images } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { DEFAULT_PIXEL_SIZE } from "../gameImg/mosaicLogic.js";
import sharp from "sharp";

// ハンドラと同じ経路で S3 関数を参照する。isolate:false では他ファイルが先に
// db/s3.js を読み込むと、ここで直接 import したものとハンドラが呼ぶものが別物になりうる
const s3 = () => import("../shared/index.js");

const D = "@mosaicEdit.test";
const ORIGIN = "http://localhost:3000";

beforeEach(async () => {
  await cleanDb();
  vi.clearAllMocks();
});

const setupOwner = () => registerAndLogin("Owner", `owner${D}`);

const json = (cookie: string) => ({
  "Content-Type": "application/json",
  Cookie: cookie,
});

const makePngFile = async () => {
  const png = await sharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 200, g: 30, b: 30 } },
  })
    .png()
    .toBuffer();
  // Buffer は BlobPart として受け付けられないため Uint8Array に変換する
  return new File([new Uint8Array(png)], "photo.png", { type: "image/png" });
};

/** 試合風景を投稿して { gameId, imageId } を返す */
async function postGameImg(cookie: string) {
  const fd = new FormData();
  fd.append("image", await makePngFile());
  const res = await app.request("/api/gameImg", {
    method: "POST",
    headers: { Cookie: cookie, Origin: ORIGIN },
    body: fd,
  });
  if (res.status !== 200) {
    throw new Error(`postGameImg failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { data: { id: string } };
  const rows = await testDb.select().from(images).where(eq(images.game_id, body.data.id));
  return { gameId: body.data.id, imageId: rows[0]?.id ?? "" };
}

const mosaicUrl = (imageId: string) => `/api/gameImg/images/${imageId}/mosaic`;

const postMosaic = (cookie: string, imageId: string, body: unknown) =>
  app.request(mosaicUrl(imageId), {
    method: "POST",
    headers: json(cookie),
    body: JSON.stringify(body),
  });

const getRow = async (imageId: string) =>
  (await testDb.select().from(images).where(eq(images.id, imageId)))[0]!;

describe("POST /api/gameImg/images/:imageId/mosaic（領域の保存）", () => {
  it("regions 配列で複数領域を適用し、粗さを補完して保存する", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);

    const res = await postMosaic(cookie, imageId, {
      regions: [
        { x: 0, y: 0, width: 20, height: 20 },
        { x: 50, y: 50, width: 30, height: 30, pixel_size: 5 },
      ],
    });
    expect(res.status).toBe(200);

    const row = await getRow(imageId);
    expect(row.mosaic_regions).toEqual([
      { x: 0, y: 0, width: 20, height: 20, pixel_size: DEFAULT_PIXEL_SIZE },
      { x: 50, y: 50, width: 30, height: 30, pixel_size: 5 },
    ]);
  });

  it("従来の単体指定も受け付け、1件の一覧として保存する", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);

    expect((await postMosaic(cookie, imageId, { x: 0, y: 0, width: 20, height: 20 })).status).toBe(200);
    expect((await getRow(imageId)).mosaic_regions).toHaveLength(1);
  });

  it("再適用すると領域一覧が置き換わり、原本と公開用のキーは変わらない", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);

    await postMosaic(cookie, imageId, { regions: [{ x: 0, y: 0, width: 20, height: 20 }] });
    const first = await getRow(imageId);

    await postMosaic(cookie, imageId, { regions: [{ x: 10, y: 10, width: 40, height: 40 }] });
    const second = await getRow(imageId);

    expect(second.mosaic_regions).toEqual([
      { x: 10, y: 10, width: 40, height: 40, pixel_size: DEFAULT_PIXEL_SIZE },
    ]);
    expect(second.original_path).toBe(first.original_path);
    expect(second.path).toBe(first.path);
  });

  it("領域数が上限を超えると400で、既存の領域は変わらない", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);
    await postMosaic(cookie, imageId, { regions: [{ x: 0, y: 0, width: 20, height: 20 }] });

    const tooMany = Array.from({ length: 21 }, () => ({ x: 0, y: 0, width: 10, height: 10 }));
    expect((await postMosaic(cookie, imageId, { regions: tooMany })).status).toBe(400);
    expect((await getRow(imageId)).mosaic_regions).toHaveLength(1);
  });

  it("空の regions は400（解除は DELETE を使う）", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);
    expect((await postMosaic(cookie, imageId, { regions: [] })).status).toBe(400);
  });

  it("どれか1つでも画像からはみ出す領域があれば400", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);
    const res = await postMosaic(cookie, imageId, {
      regions: [
        { x: 0, y: 0, width: 20, height: 20 },
        // s3Mock の原本は 200×200
        { x: 190, y: 0, width: 20, height: 20 },
      ],
    });
    expect(res.status).toBe(400);
    expect((await getRow(imageId)).mosaic_regions).toBeNull();
  });
});

describe("GET /api/gameImg/images/:imageId/mosaic", () => {
  it("未適用なら has_mosaic=false・領域は空で、原本URLは公開用と同じ", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);

    const res = await app.request(mosaicUrl(imageId), { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      data: { url: string; original_url: string; has_mosaic: boolean; mosaic_regions: unknown[] };
    };
    expect(data.has_mosaic).toBe(false);
    expect(data.mosaic_regions).toEqual([]);
    expect(data.original_url).toBe(data.url);
  });

  it("適用後は保存した領域と退避した原本のURLを返す", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);
    await postMosaic(cookie, imageId, { regions: [{ x: 0, y: 0, width: 20, height: 20 }] });
    const row = await getRow(imageId);

    const res = await app.request(mosaicUrl(imageId), { headers: { Cookie: cookie } });
    const { data } = (await res.json()) as {
      data: { original_url: string; has_mosaic: boolean; mosaic_regions: unknown[] };
    };
    expect(data.has_mosaic).toBe(true);
    expect(data.mosaic_regions).toHaveLength(1);
    expect(data.original_url).toContain(row.original_path!);
  });

  it("member は 403（原本URLを管理者以外に渡さない）", async () => {
    const cookie = await setupOwner();
    const memberCookie = await registerAndLogin("Member", `member${D}`);
    const { imageId } = await postGameImg(cookie);
    const res = await app.request(mosaicUrl(imageId), { headers: { Cookie: memberCookie } });
    expect(res.status).toBe(403);
  });

  it("存在しない画像は404", async () => {
    const cookie = await setupOwner();
    const res = await app.request(mosaicUrl("00000000-0000-0000-0000-000000000000"), {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/gameImg/images/:imageId/mosaic", () => {
  it("公開用のキーに原本を書き戻し、退避した原本を消して未適用に戻す", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);
    await postMosaic(cookie, imageId, { regions: [{ x: 0, y: 0, width: 20, height: 20 }] });
    const applied = await getRow(imageId);
    vi.clearAllMocks();

    const res = await app.request(mosaicUrl(imageId), {
      method: "DELETE",
      headers: { Cookie: cookie, Origin: ORIGIN },
    });
    expect(res.status).toBe(200);

    const row = await getRow(imageId);
    expect(row.path).toBe(applied.path);
    expect(row.original_path).toBeNull();
    expect(row.mosaic_regions).toBeNull();
    expect(vi.mocked((await s3()).uploadToS3)).toHaveBeenCalledWith(expect.any(Buffer), applied.path, "image/webp");
    expect(vi.mocked((await s3()).deleteFromS3)).toHaveBeenCalledWith(applied.original_path);
  });

  it("解除後にもう一度適用すると、原本を改めて退避する", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);
    await postMosaic(cookie, imageId, { regions: [{ x: 0, y: 0, width: 20, height: 20 }] });
    await app.request(mosaicUrl(imageId), {
      method: "DELETE",
      headers: { Cookie: cookie, Origin: ORIGIN },
    });

    expect((await postMosaic(cookie, imageId, { x: 0, y: 0, width: 20, height: 20 })).status).toBe(200);
    const row = await getRow(imageId);
    expect(row.original_path).toMatch(/^originals\//);
    expect(row.original_path).not.toBe(row.path);
  });

  it("未適用の画像は400", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);
    const res = await app.request(mosaicUrl(imageId), {
      method: "DELETE",
      headers: { Cookie: cookie, Origin: ORIGIN },
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/gameImg/:id/:imageId（画像差し替え）", () => {
  it("モザイク適用済みの画像を差し替えると、退避した原本と領域を破棄する", async () => {
    const cookie = await setupOwner();
    const { gameId, imageId } = await postGameImg(cookie);
    await postMosaic(cookie, imageId, { regions: [{ x: 0, y: 0, width: 20, height: 20 }] });
    const applied = await getRow(imageId);
    vi.clearAllMocks();

    const fd = new FormData();
    fd.append("image", await makePngFile());
    const res = await app.request(`/api/gameImg/${gameId}/${imageId}`, {
      method: "PATCH",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(200);

    const row = await getRow(imageId);
    expect(row.original_path).toBeNull();
    expect(row.mosaic_regions).toBeNull();
    expect(vi.mocked((await s3()).deleteFromS3)).toHaveBeenCalledWith(applied.original_path);
  });
});
