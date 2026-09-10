// 原本保全・関係者向け原本配布・掲載取り下げ依頼（Phase 3）統合テスト
//
// 設計書 §5-2 の「モザイクが原本を上書きしている」問題が直っていること、
// および member が原本を、一般ユーザーが公開用画像だけを見ることを検証する。

import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { cleanDb, testDb } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";
import { images } from "../db/schema.js";
import { eq } from "drizzle-orm";
import * as s3 from "../db/s3.js";
import sharp from "sharp";

const D = "@memberGallery.test";
const ORIGIN = "http://localhost:3000";

beforeEach(async () => {
  await cleanDb();
  vi.clearAllMocks();
});

const setupOwner = () => registerAndLogin("Owner", `owner${D}`);
const setupMember = () => registerAndLogin("Member", `member${D}`);

const json = (cookie: string) => ({
  "Content-Type": "application/json",
  Cookie: cookie,
});

/** 実際に読める小さな PNG を作る（sharp のメタデータ取得を通すため） */
const makePng = async (width = 100, height = 100) =>
  sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 30, b: 30 } },
  })
    .png()
    .toBuffer();

/** 試合風景を投稿して { gameId, imageId } を返す */
async function postGameImg(cookie: string) {
  const fd = new FormData();
  // Buffer は BlobPart として受け付けられないため Uint8Array に変換する
  const png = new Uint8Array(await makePng());
  fd.append("image", new File([png], "photo.png", { type: "image/png" }));

  const res = await app.request("/api/gameImg", {
    method: "POST",
    headers: { Cookie: cookie, Origin: ORIGIN },
    body: fd,
  });
  if (res.status !== 200) {
    throw new Error(`postGameImg failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { data: { id: string } };

  // 作成レスポンスに画像IDが含まれないためDBから引く
  const rows = await testDb
    .select()
    .from(images)
    .where(eq(images.game_id, body.data.id));

  return { gameId: body.data.id, imageId: rows[0]?.id ?? "" };
}

/** 掲載同意ステータスを変更する */
async function setConsent(
  cookie: string,
  imageId: string,
  status: "approved" | "rejected" | "pending",
) {
  const res = await app.request(`/api/gameImg/images/${imageId}/consent`, {
    method: "PATCH",
    headers: json(cookie),
    body: JSON.stringify({ consent_status: status }),
  });
  if (res.status !== 200) {
    throw new Error(`setConsent failed: ${res.status} ${await res.text()}`);
  }
}

/** モザイクを適用する */
const applyMosaic = (cookie: string, imageId: string) =>
  app.request(`/api/gameImg/images/${imageId}/mosaic`, {
    method: "POST",
    headers: json(cookie),
    body: JSON.stringify({ x: 0, y: 0, width: 20, height: 20 }),
  });

// --- 原本保全（設計書 §5-2） ---

describe("モザイク適用時の原本保全", () => {
  it("初回適用で原本が別キーへ退避される", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);

    const before = await testDb.select().from(images).where(eq(images.id, imageId));
    expect(before[0]?.original_path).toBeNull();

    const res = await applyMosaic(cookie, imageId);
    expect(res.status).toBe(200);

    const after = await testDb.select().from(images).where(eq(images.id, imageId));
    expect(after[0]?.original_path).toMatch(/^originals\//);
    // 公開用のキーは変わらない（既存の参照が壊れない）
    expect(after[0]?.path).toBe(before[0]?.path);
  });

  it("2回目の適用では原本パスが上書きされない", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);

    await applyMosaic(cookie, imageId);
    const first = await testDb.select().from(images).where(eq(images.id, imageId));

    await applyMosaic(cookie, imageId);
    const second = await testDb.select().from(images).where(eq(images.id, imageId));

    expect(second[0]?.original_path).toBe(first[0]?.original_path);
  });

  it("2回目の適用は原本を起点にする（モザイクの重ねがけを防ぐ）", async () => {
    const cookie = await setupOwner();
    const { imageId } = await postGameImg(cookie);

    await applyMosaic(cookie, imageId);
    const row = await testDb.select().from(images).where(eq(images.id, imageId));
    const originalPath = row[0]?.original_path;

    vi.mocked(s3.downloadFromS3).mockClear();
    await applyMosaic(cookie, imageId);

    // 2回目のダウンロード元が退避した原本になっている
    expect(vi.mocked(s3.downloadFromS3).mock.calls[0]?.[0]).toBe(originalPath);
  });
});

// --- 可視性 ---

describe("試合風景の可視性", () => {
  it("未ログインには公開用画像（path）が返る", async () => {
    const cookie = await setupOwner();
    const { gameId, imageId } = await postGameImg(cookie);
    await setConsent(cookie, imageId, "approved");
    await applyMosaic(cookie, imageId);

    const res = await app.request(`/api/gameImg/${gameId}`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: { images: Array<{ url: string; consent_status?: string }> };
    };
    expect(body.data.images[0]?.url).not.toContain("originals/");
    // 一般ユーザーには掲載同意ステータスを返さない
    expect(body.data.images[0]?.consent_status).toBeUndefined();
  });

  it("member には原本が返る", async () => {
    const ownerCookie = await setupOwner();
    const { gameId, imageId } = await postGameImg(ownerCookie);
    await setConsent(ownerCookie, imageId, "approved");
    await applyMosaic(ownerCookie, imageId);
    const memberCookie = await setupMember();

    const res = await app.request(`/api/gameImg/${gameId}`, {
      headers: { Cookie: memberCookie },
    });
    const body = (await res.json()) as {
      data: { images: Array<{ url: string; is_original: boolean }> };
    };
    expect(body.data.images[0]?.url).toContain("originals/");
    expect(body.data.images[0]?.is_original).toBe(true);
  });

  it("member は未承認の写真も見られる", async () => {
    const ownerCookie = await setupOwner();
    const { gameId } = await postGameImg(ownerCookie);
    const memberCookie = await setupMember();

    // 未ログインには approved が0件なので見えない
    expect((await app.request(`/api/gameImg/${gameId}`)).status).toBe(404);

    const res = await app.request(`/api/gameImg/${gameId}`, {
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(200);
  });
});

// --- 関係者ギャラリー ---

describe("GET /api/members/gallery", () => {
  it("member は原本一覧を取得できる", async () => {
    const ownerCookie = await setupOwner();
    const { imageId } = await postGameImg(ownerCookie);
    await applyMosaic(ownerCookie, imageId);
    const memberCookie = await setupMember();

    const res = await app.request("/api/members/gallery", {
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: Array<{ id: string; url: string; is_original: boolean }>;
      pagination: { total: number };
    };
    expect(body.pagination.total).toBe(1);
    expect(body.data[0]?.url).toContain("originals/");
    expect(body.data[0]?.is_original).toBe(true);
  });

  it("モザイク未適用の画像は path がそのまま原本になる", async () => {
    const ownerCookie = await setupOwner();
    await postGameImg(ownerCookie);
    const memberCookie = await setupMember();

    const res = await app.request("/api/members/gallery", {
      headers: { Cookie: memberCookie },
    });
    const body = (await res.json()) as {
      data: Array<{ url: string; is_original: boolean }>;
    };
    expect(body.data[0]?.is_original).toBe(false);
    // 退避が無いので公開用キー（game/配下）をそのまま原本として返す
    expect(body.data[0]?.url).toContain("game/");
    expect(body.data[0]?.url).not.toContain("originals/");
  });

  it("未ログインは 401", async () => {
    expect((await app.request("/api/members/gallery")).status).toBe(401);
  });
});

describe("GET /api/members/gallery/:imageId/download", () => {
  it("member は原本のダウンロードURLを取得できる", async () => {
    const ownerCookie = await setupOwner();
    const { imageId } = await postGameImg(ownerCookie);
    await applyMosaic(ownerCookie, imageId);
    const memberCookie = await setupMember();

    const res = await app.request(`/api/members/gallery/${imageId}/download`, {
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: { url: string; is_original: boolean; expires_in: number };
    };
    expect(body.data.url).toContain("originals/");
    expect(body.data.is_original).toBe(true);
    expect(body.data.expires_in).toBe(300);
  });

  it("未ログインは 401", async () => {
    const ownerCookie = await setupOwner();
    const { imageId } = await postGameImg(ownerCookie);
    const res = await app.request(`/api/members/gallery/${imageId}/download`);
    expect(res.status).toBe(401);
  });

  it("存在しない画像は 404", async () => {
    const memberCookie = await setupOwner();
    const res = await app.request(
      "/api/members/gallery/00000000-0000-0000-0000-000000000000/download",
      { headers: { Cookie: memberCookie } },
    );
    expect(res.status).toBe(404);
  });
});

// --- 掲載取り下げ依頼 ---

describe("掲載取り下げ依頼", () => {
  /** 依頼を作って ID を返す */
  async function requestTakedown(cookie: string, imageId: string, reason?: string) {
    const res = await app.request("/api/consent-requests", {
      method: "POST",
      headers: json(cookie),
      body: JSON.stringify({ image_id: imageId, ...(reason && { reason }) }),
    });
    return { status: res.status, body: (await res.json()) as { data?: { id: string } } };
  }

  it("member は取り下げを依頼できる", async () => {
    const ownerCookie = await setupOwner();
    const { imageId } = await postGameImg(ownerCookie);
    const memberCookie = await setupMember();

    const { status, body } = await requestTakedown(
      memberCookie,
      imageId,
      "子どもの顔が写っているため",
    );
    expect(status).toBe(200);
    expect(body.data?.id).toBeTruthy();
  });

  it("未ログインは 401", async () => {
    const ownerCookie = await setupOwner();
    const { imageId } = await postGameImg(ownerCookie);

    const res = await app.request("/api/consent-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_id: imageId }),
    });
    expect(res.status).toBe(401);
  });

  it("存在しない画像への依頼は 404", async () => {
    await setupOwner();
    const memberCookie = await setupMember();
    const { status } = await requestTakedown(
      memberCookie,
      "00000000-0000-0000-0000-000000000000",
    );
    expect(status).toBe(404);
  });

  it("依頼一覧は admin 以上のみ", async () => {
    const ownerCookie = await setupOwner();
    const { imageId } = await postGameImg(ownerCookie);
    const memberCookie = await setupMember();
    await requestTakedown(memberCookie, imageId, "理由");

    expect(
      (await app.request("/api/consent-requests", { headers: { Cookie: memberCookie } }))
        .status,
    ).toBe(403);

    const res = await app.request("/api/consent-requests", {
      headers: { Cookie: ownerCookie },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: Array<{ reason: string; status: string; requester_email: string }>;
    };
    expect(body.data[0]?.status).toBe("pending");
    expect(body.data[0]?.reason).toBe("理由");
    expect(body.data[0]?.requester_email).toBe(`member${D}`);
  });

  it("承認すると対象画像が非掲載になる", async () => {
    const ownerCookie = await setupOwner();
    const { gameId, imageId } = await postGameImg(ownerCookie);
    await setConsent(ownerCookie, imageId, "approved");
    const memberCookie = await setupMember();

    const { body } = await requestTakedown(memberCookie, imageId, "理由");

    const res = await app.request(`/api/consent-requests/${body.data?.id}`, {
      method: "PATCH",
      headers: json(ownerCookie),
      body: JSON.stringify({ status: "accepted" }),
    });
    expect(res.status).toBe(200);

    // 公開ギャラリーから消える（approved が0件になる）
    expect((await app.request(`/api/gameImg/${gameId}`)).status).toBe(404);

    const row = await testDb.select().from(images).where(eq(images.id, imageId));
    expect(row[0]?.consent_status).toBe("rejected");
  });

  it("却下しても画像の掲載状態は変わらない", async () => {
    const ownerCookie = await setupOwner();
    const { imageId } = await postGameImg(ownerCookie);
    await setConsent(ownerCookie, imageId, "approved");
    const memberCookie = await setupMember();

    const { body } = await requestTakedown(memberCookie, imageId);

    const res = await app.request(`/api/consent-requests/${body.data?.id}`, {
      method: "PATCH",
      headers: json(ownerCookie),
      body: JSON.stringify({ status: "rejected" }),
    });
    expect(res.status).toBe(200);

    const row = await testDb.select().from(images).where(eq(images.id, imageId));
    expect(row[0]?.consent_status).toBe("approved");
  });

  it("対応済みの依頼は再度対応できない", async () => {
    const ownerCookie = await setupOwner();
    const { imageId } = await postGameImg(ownerCookie);
    const memberCookie = await setupMember();
    const { body } = await requestTakedown(memberCookie, imageId);

    const patch = () =>
      app.request(`/api/consent-requests/${body.data?.id}`, {
        method: "PATCH",
        headers: json(ownerCookie),
        body: JSON.stringify({ status: "accepted" }),
      });

    expect((await patch()).status).toBe(200);
    expect((await patch()).status).toBe(400);
  });

  it("status に pending は指定できない", async () => {
    const ownerCookie = await setupOwner();
    const { imageId } = await postGameImg(ownerCookie);
    const memberCookie = await setupMember();
    const { body } = await requestTakedown(memberCookie, imageId);

    const res = await app.request(`/api/consent-requests/${body.data?.id}`, {
      method: "PATCH",
      headers: json(ownerCookie),
      body: JSON.stringify({ status: "pending" }),
    });
    expect(res.status).toBe(400);
  });

  it("status で絞り込める", async () => {
    const ownerCookie = await setupOwner();
    const first = await postGameImg(ownerCookie);
    const second = await postGameImg(ownerCookie);
    const memberCookie = await setupMember();

    const a = await requestTakedown(memberCookie, first.imageId);
    await requestTakedown(memberCookie, second.imageId);

    await app.request(`/api/consent-requests/${a.body.data?.id}`, {
      method: "PATCH",
      headers: json(ownerCookie),
      body: JSON.stringify({ status: "accepted" }),
    });

    const res = await app.request("/api/consent-requests?status=pending", {
      headers: { Cookie: ownerCookie },
    });
    const body = (await res.json()) as { pagination: { total: number } };
    expect(body.pagination.total).toBe(1);
  });
});
