// 実績API CRUD統合テスト
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { cleanDb, testPool } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";

const D = "@achievement.test";

beforeEach(async () => {
  await cleanDb();
});

function achievementForm(title: string, body: string) {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("body", body);
  return fd;
}

const ORIGIN = "http://localhost:3000";

async function postAchievement(cookie: string, title: string, body: string) {
  return app.request("/api/achievement", {
    method: "POST",
    headers: { Cookie: cookie, Origin: ORIGIN },
    body: achievementForm(title, body),
  });
}

// 1x1 透明PNG（実データなのでsharpでの圧縮処理を通せる）
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const pngFile = (name: string) => new File([PNG_1X1], name, { type: "image/png" });

describe("POST /api/achievement — 本文の画像", () => {
  it("images で送った画像が詳細の images に返り、サムネイルとは別に保存される", async () => {
    const cookie = await registerAndLogin("Owner", `bodyimg${D}`);
    const fd = achievementForm("画像付きタイトル", "画像付きの本文です。");
    fd.append("image", pngFile("thumb.png"));
    fd.append("images", pngFile("a.png"));
    fd.append("images", pngFile("b.png"));
    const res = await app.request("/api/achievement", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(200);
    const created = (await res.json()) as { data: { id: string; img: string | null } };
    expect(created.data.img).toBeTruthy();

    const detail = (await (await app.request(`/api/achievement/${created.data.id}`)).json()) as {
      data: { images: { id: string; url: string }[] };
    };
    expect(detail.data.images).toHaveLength(2);
  });

  it("本文の画像が11枚以上なら400で、実績は作られない", async () => {
    const cookie = await registerAndLogin("Owner", `bodyimg2${D}`);
    const fd = achievementForm("枚数超過タイトル", "枚数超過の本文です。");
    for (let i = 0; i < 11; i++) fd.append("images", pngFile(`${i}.png`));
    const res = await app.request("/api/achievement", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(400);
    const rows = await testPool.query("SELECT id FROM achievement");
    expect(rows.rowCount).toBe(0);
  });
});

describe("POST /api/achievement", () => {
  it("owner は実績を作成できる", async () => {
    const cookie = await registerAndLogin("Owner", `owner${D}`);
    const res = await postAchievement(cookie, "タイトル", "本文です。本文です。");
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { id: string; title: string } };
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("タイトル");
  });

  it("member は 403", async () => {
    await registerAndLogin("Owner", `owner${D}`);
    const memberCookie = await registerAndLogin("Member", `member${D}`);
    const res = await postAchievement(memberCookie, "タイトル", "本文です。本文です。");
    expect(res.status).toBe(403);
  });

  it("認証なしは 401", async () => {
    const res = await app.request("/api/achievement", {
      method: "POST",
      headers: { Origin: ORIGIN },
      body: achievementForm("タイトル", "本文です。本文です。"),
    });
    expect(res.status).toBe(401);
  });

  it("titleが空だと400", async () => {
    const cookie = await registerAndLogin("Owner", `owner2${D}`);
    const res = await postAchievement(cookie, "", "本文です。本文です。");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/achievement", () => {
  it("一覧を取得できる（認証不要）", async () => {
    const cookie = await registerAndLogin("Owner", `owner3${D}`);
    await postAchievement(cookie, "タイトルA", "本文です。本文です。");
    await postAchievement(cookie, "タイトルB", "本文です。本文です。");

    const res = await app.request("/api/achievement");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: Array<{ title: string }> };
    expect(body.data).toHaveLength(2);
  });
});

describe("GET /api/achievement/:id", () => {
  it("1件取得できる", async () => {
    const cookie = await registerAndLogin("Owner", `owner4${D}`);
    const postRes = await postAchievement(cookie, "タイトル", "本文です。本文です。");
    const postBody = await postRes.json() as { data: { id: string } };

    const res = await app.request(`/api/achievement/${postBody.data.id}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { title: string } };
    expect(body.data.title).toBe("タイトル");
  });

  it("存在しないIDは404", async () => {
    const res = await app.request("/api/achievement/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/achievement/:id", () => {
  it("owner は更新できる", async () => {
    const cookie = await registerAndLogin("Owner", `owner5${D}`);
    const postRes = await postAchievement(cookie, "旧タイトル", "本文です。本文です。");
    const postBody = await postRes.json() as { data: { id: string } };

    const fd = new FormData();
    fd.append("title", "新タイトル");
    const res = await app.request(`/api/achievement/${postBody.data.id}`, {
      method: "PATCH",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { title: string } };
    expect(body.data.title).toBe("新タイトル");
  });

  it("member は 403", async () => {
    const ownerCookie = await registerAndLogin("Owner", `owner6${D}`);
    const memberCookie = await registerAndLogin("Member", `member6${D}`);
    const postRes = await postAchievement(ownerCookie, "タイトル", "本文です。本文です。");
    const postBody = await postRes.json() as { data: { id: string } };

    const fd = new FormData();
    fd.append("title", "新タイトル");
    const res = await app.request(`/api/achievement/${postBody.data.id}`, {
      method: "PATCH",
      headers: { Cookie: memberCookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(403);
  });

  it("存在しないIDは404", async () => {
    const cookie = await registerAndLogin("Owner", `owner7${D}`);
    const fd = new FormData();
    fd.append("title", "新タイトル");
    const res = await app.request("/api/achievement/00000000-0000-0000-0000-000000000000", {
      method: "PATCH",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/achievement/:id", () => {
  it("owner は削除できる", async () => {
    const cookie = await registerAndLogin("Owner", `owner8${D}`);
    const postRes = await postAchievement(cookie, "タイトル", "本文です。本文です。");
    const postBody = await postRes.json() as { data: { id: string } };

    const res = await app.request(`/api/achievement/${postBody.data.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie, Origin: ORIGIN },
    });
    expect(res.status).toBe(200);

    const getRes = await app.request(`/api/achievement/${postBody.data.id}`);
    expect(getRes.status).toBe(404);
  });

  it("member は 403", async () => {
    const ownerCookie = await registerAndLogin("Owner", `owner9${D}`);
    const memberCookie = await registerAndLogin("Member", `member9${D}`);
    const postRes = await postAchievement(ownerCookie, "タイトル", "本文です。本文です。");
    const postBody = await postRes.json() as { data: { id: string } };

    const res = await app.request(`/api/achievement/${postBody.data.id}`, {
      method: "DELETE",
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(403);
  });

  it("認証なしは401", async () => {
    const cookie = await registerAndLogin("Owner", `owner10${D}`);
    const postRes = await postAchievement(cookie, "タイトル", "本文です。本文です。");
    const postBody = await postRes.json() as { data: { id: string } };

    const res = await app.request(`/api/achievement/${postBody.data.id}`, {
      method: "DELETE",
      headers: { Origin: ORIGIN },
    });
    expect(res.status).toBe(401);
  });

  it("存在しないIDは404", async () => {
    const cookie = await registerAndLogin("Owner", `owner11${D}`);
    const res = await app.request("/api/achievement/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
      headers: { Cookie: cookie, Origin: ORIGIN },
    });
    expect(res.status).toBe(404);
  });
});
