// 試合風景API CRUD統合テスト
// S3への実アクセスはsetupFiles(s3Mock.setup.ts)でグローバルにモックされている
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { cleanDb, testPool } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";

const D = "@gameImg.test";

// 1x1 透明PNG（実データなのでsharpでの圧縮処理を通せる）
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function pngFile(name = "photo.png") {
  return new File([PNG_1X1], name, { type: "image/png" });
}

const ORIGIN = "http://localhost:3000";

async function postGameImg(cookie: string, consentConfirmed?: string) {
  const fd = new FormData();
  fd.append("image", pngFile());
  if (consentConfirmed !== undefined) fd.append("consent_confirmed", consentConfirmed);
  return app.request("/api/gameImg", {
    method: "POST",
    headers: { Cookie: cookie, Origin: ORIGIN },
    body: fd,
  });
}

beforeEach(async () => {
  await cleanDb();
});

describe("POST /api/gameImg", () => {
  it("owner は画像付きで作成できる", async () => {
    const cookie = await registerAndLogin("Owner", `owner${D}`);
    const res = await postGameImg(cookie);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { id: string } };
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTruthy();
  });

  it("画像なしは400", async () => {
    const cookie = await registerAndLogin("Owner", `owner2${D}`);
    const res = await app.request("/api/gameImg", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: new FormData(),
    });
    expect(res.status).toBe(400);
  });

  it("member は 403", async () => {
    await registerAndLogin("Owner", `owner3${D}`);
    const memberCookie = await registerAndLogin("Member", `member3${D}`);
    expect((await postGameImg(memberCookie)).status).toBe(403);
  });

  it("認証なしは 401", async () => {
    const fd = new FormData();
    fd.append("image", pngFile());
    expect(
      (await app.request("/api/gameImg", { method: "POST", headers: { Origin: ORIGIN }, body: fd })).status,
    ).toBe(401);
  });

  it("許可されていない拡張子は400", async () => {
    const cookie = await registerAndLogin("Owner", `owner4${D}`);
    const fd = new FormData();
    fd.append("image", new File([PNG_1X1], "photo.exe", { type: "application/octet-stream" }));
    const res = await app.request("/api/gameImg", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/gameImg — 公開範囲", () => {
  it("作成直後（未承認）は一般公開では見えない", async () => {
    const cookie = await registerAndLogin("Owner", `owner5${D}`);
    await postGameImg(cookie);

    const publicRes = await app.request("/api/gameImg");
    const publicBody = await publicRes.json() as { data: unknown[] };
    expect(publicBody.data).toHaveLength(0);
  });

  it("作成直後でも管理者には見える", async () => {
    const cookie = await registerAndLogin("Owner", `owner6${D}`);
    await postGameImg(cookie);

    const adminRes = await app.request("/api/gameImg", { headers: { Cookie: cookie } });
    const adminBody = await adminRes.json() as { data: unknown[] };
    expect(adminBody.data).toHaveLength(1);
  });

  it("承認後は一般公開でも見える", async () => {
    const cookie = await registerAndLogin("Owner", `owner7${D}`);
    await postGameImg(cookie);

    await testPool.query(`UPDATE images SET consent_status = 'approved'`);

    const publicRes = await app.request("/api/gameImg");
    const publicBody = await publicRes.json() as { data: unknown[] };
    expect(publicBody.data).toHaveLength(1);
  });
});

describe("POST /api/gameImg — 投稿者による掲載OKの確認", () => {
  it("consent_confirmed=true なら作成直後から一般公開で見える", async () => {
    const cookie = await registerAndLogin("Owner", `owner-consent1${D}`);
    expect((await postGameImg(cookie, "true")).status).toBe(200);

    const { rows } = await testPool.query(`SELECT consent_status FROM images`);
    expect(rows.map((r) => r.consent_status)).toEqual(["approved"]);

    const publicBody = await (await app.request("/api/gameImg")).json() as { data: unknown[] };
    expect(publicBody.data).toHaveLength(1);
  });

  it("consent_confirmed が true 以外なら pending のまま", async () => {
    const cookie = await registerAndLogin("Owner", `owner-consent2${D}`);
    expect((await postGameImg(cookie, "false")).status).toBe(200);

    const { rows } = await testPool.query(`SELECT consent_status FROM images`);
    expect(rows.map((r) => r.consent_status)).toEqual(["pending"]);
  });
});

describe("GET /api/gameImg/:id", () => {
  it("存在しないIDは404", async () => {
    const res = await app.request("/api/gameImg/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("未承認画像しかない場合、一般公開では404", async () => {
    const cookie = await registerAndLogin("Owner", `owner8${D}`);
    const postRes = await postGameImg(cookie);
    const postBody = await postRes.json() as { data: { id: string } };

    const res = await app.request(`/api/gameImg/${postBody.data.id}`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/gameImg — 公開状態（status）", () => {
  // 画像は承認済みにしておき、consent_status ではなく status の違いだけを検証する
  async function seedGame(ownerCookie: string, status: "draft" | "pending" | "published") {
    const postRes = await postGameImg(ownerCookie);
    const postBody = await postRes.json() as { data: { id: string } };
    await testPool.query(`UPDATE images SET consent_status = 'approved' WHERE game_id = $1`, [
      postBody.data.id,
    ]);
    await testPool.query(`UPDATE game SET status = $1 WHERE id = $2`, [status, postBody.data.id]);
    return postBody.data.id;
  }

  it("一覧: 下書き・承認待ちは一般公開と member には出ない", async () => {
    const ownerCookie = await registerAndLogin("Owner", `owner-st1${D}`);
    const memberCookie = await registerAndLogin("Member", `member-st1${D}`);
    const publishedId = await seedGame(ownerCookie, "published");
    await seedGame(ownerCookie, "draft");
    await seedGame(ownerCookie, "pending");

    for (const headers of [{}, { Cookie: memberCookie }]) {
      const res = await app.request("/api/gameImg", { headers });
      const body = await res.json() as {
        data: Array<{ id: string }>;
        pagination: { total: number };
      };
      expect(body.data.map((g) => g.id)).toEqual([publishedId]);
      // 件数もフィルタ後の値になっていること
      expect(body.pagination.total).toBe(1);
    }
  });

  it("一覧: admin 以上には下書き・承認待ちも出る", async () => {
    const ownerCookie = await registerAndLogin("Owner", `owner-st2${D}`);
    const adminCookie = await registerAndLogin("Admin", `admin-st2${D}`, undefined, "admin");
    await seedGame(ownerCookie, "published");
    await seedGame(ownerCookie, "draft");
    await seedGame(ownerCookie, "pending");

    for (const cookie of [ownerCookie, adminCookie]) {
      const res = await app.request("/api/gameImg", { headers: { Cookie: cookie } });
      const body = await res.json() as { data: unknown[] };
      expect(body.data).toHaveLength(3);
    }
  });

  it("詳細: 下書き・承認待ちは一般公開と member には404", async () => {
    const ownerCookie = await registerAndLogin("Owner", `owner-st3${D}`);
    const memberCookie = await registerAndLogin("Member", `member-st3${D}`);
    const draftId = await seedGame(ownerCookie, "draft");
    const pendingId = await seedGame(ownerCookie, "pending");

    for (const id of [draftId, pendingId]) {
      expect((await app.request(`/api/gameImg/${id}`)).status).toBe(404);
      expect(
        (await app.request(`/api/gameImg/${id}`, { headers: { Cookie: memberCookie } })).status,
      ).toBe(404);
    }
  });

  it("詳細: admin 以上は下書き・承認待ちも取得できる", async () => {
    const ownerCookie = await registerAndLogin("Owner", `owner-st4${D}`);
    const adminCookie = await registerAndLogin("Admin", `admin-st4${D}`, undefined, "admin");
    const draftId = await seedGame(ownerCookie, "draft");
    const pendingId = await seedGame(ownerCookie, "pending");

    for (const id of [draftId, pendingId]) {
      for (const cookie of [ownerCookie, adminCookie]) {
        const res = await app.request(`/api/gameImg/${id}`, { headers: { Cookie: cookie } });
        expect(res.status).toBe(200);
      }
    }
  });

  it("詳細: 公開済みは一般公開でも取得できる", async () => {
    const ownerCookie = await registerAndLogin("Owner", `owner-st5${D}`);
    const publishedId = await seedGame(ownerCookie, "published");
    expect((await app.request(`/api/gameImg/${publishedId}`)).status).toBe(200);
  });
});

describe("PATCH /api/gameImg/images/:imageId/consent", () => {
  it("owner は承認ステータスを更新できる", async () => {
    const cookie = await registerAndLogin("Owner", `owner9${D}`);
    await postGameImg(cookie);
    const { rows } = await testPool.query(`SELECT id FROM images LIMIT 1`);
    const imageId = rows[0].id as string;

    const res = await app.request(`/api/gameImg/images/${imageId}/consent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ consent_status: "approved" }),
    });
    expect(res.status).toBe(200);
  });

  it("不正なconsent_statusは400", async () => {
    const cookie = await registerAndLogin("Owner", `owner10${D}`);
    await postGameImg(cookie);
    const { rows } = await testPool.query(`SELECT id FROM images LIMIT 1`);
    const imageId = rows[0].id as string;

    const res = await app.request(`/api/gameImg/images/${imageId}/consent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ consent_status: "invalid" }),
    });
    expect(res.status).toBe(400);
  });

  it("member は 403", async () => {
    const ownerCookie = await registerAndLogin("Owner", `owner11${D}`);
    const memberCookie = await registerAndLogin("Member", `member11${D}`);
    await postGameImg(ownerCookie);
    const { rows } = await testPool.query(`SELECT id FROM images LIMIT 1`);
    const imageId = rows[0].id as string;

    const res = await app.request(`/api/gameImg/images/${imageId}/consent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: memberCookie },
      body: JSON.stringify({ consent_status: "approved" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/gameImg/:id/:imageId — 画像差し替え", () => {
  it("owner は画像を差し替えられる", async () => {
    const cookie = await registerAndLogin("Owner", `owner12${D}`);
    const postRes = await postGameImg(cookie);
    const postBody = await postRes.json() as { data: { id: string } };
    const { rows } = await testPool.query(`SELECT id FROM images WHERE game_id = $1`, [postBody.data.id]);
    const imageId = rows[0].id as string;

    const fd = new FormData();
    fd.append("image", pngFile("new.png"));
    const res = await app.request(`/api/gameImg/${postBody.data.id}/${imageId}`, {
      method: "PATCH",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(200);
  });

  it("画像未指定は400", async () => {
    const cookie = await registerAndLogin("Owner", `owner13${D}`);
    const postRes = await postGameImg(cookie);
    const postBody = await postRes.json() as { data: { id: string } };
    const { rows } = await testPool.query(`SELECT id FROM images WHERE game_id = $1`, [postBody.data.id]);
    const imageId = rows[0].id as string;

    const res = await app.request(`/api/gameImg/${postBody.data.id}/${imageId}`, {
      method: "PATCH",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: new FormData(),
    });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/gameImg/:id", () => {
  it("owner は削除できる", async () => {
    const cookie = await registerAndLogin("Owner", `owner14${D}`);
    const postRes = await postGameImg(cookie);
    const postBody = await postRes.json() as { data: { id: string } };

    const res = await app.request(`/api/gameImg/${postBody.data.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie, Origin: ORIGIN },
    });
    expect(res.status).toBe(200);

    const getRes = await app.request(`/api/gameImg/${postBody.data.id}`, { headers: { Cookie: cookie } });
    expect(getRes.status).toBe(404);
  });

  it("member は 403", async () => {
    const ownerCookie = await registerAndLogin("Owner", `owner15${D}`);
    const memberCookie = await registerAndLogin("Member", `member15${D}`);
    const postRes = await postGameImg(ownerCookie);
    const postBody = await postRes.json() as { data: { id: string } };

    const res = await app.request(`/api/gameImg/${postBody.data.id}`, {
      method: "DELETE",
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(403);
  });

  it("存在しないIDは404", async () => {
    const cookie = await registerAndLogin("Owner", `owner16${D}`);
    const res = await app.request("/api/gameImg/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
      headers: { Cookie: cookie, Origin: ORIGIN },
    });
    expect(res.status).toBe(404);
  });
});
