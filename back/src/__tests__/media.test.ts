// メディア情報API CRUD統合テスト（news-postと同じnewsテーブルをtypeで分けて使用）
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { cleanDb } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";

const D = "@media.test";

beforeEach(async () => {
  await cleanDb();
});

// 1x1 透明PNG（実データなのでsharpでの圧縮処理を通せる）
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function mediaForm(title: string, body: string, category?: string) {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("body", body);
  if (category !== undefined) fd.append("category", category);
  return fd;
}

const ORIGIN = "http://localhost:3000";

async function postMedia(cookie: string, title: string, body: string, category?: string) {
  return app.request("/api/media", {
    method: "POST",
    headers: { Cookie: cookie, Origin: ORIGIN },
    body: mediaForm(title, body, category),
  });
}

async function postNews(cookie: string, title: string, body: string, category?: string) {
  return app.request("/api/news-post", {
    method: "POST",
    headers: { Cookie: cookie, Origin: ORIGIN },
    body: mediaForm(title, body, category),
  });
}

describe("POST /api/media", () => {
  it("owner はメディア情報を作成できる", async () => {
    const cookie = await registerAndLogin("Owner", `owner${D}`);
    const res = await postMedia(cookie, "タイトル", "本文です。本文です。");
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { title: string } };
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("タイトル");
  });

  it("member は 403", async () => {
    await registerAndLogin("Owner", `owner${D}`);
    const memberCookie = await registerAndLogin("Member", `member${D}`);
    expect((await postMedia(memberCookie, "タイトル", "本文です。本文です。")).status).toBe(403);
  });

  it("認証なしは 401", async () => {
    const res = await app.request("/api/media", {
      method: "POST",
      headers: { Origin: ORIGIN },
      body: mediaForm("タイトル", "本文です。本文です。"),
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/media", () => {
  it("一覧を取得できる（認証不要）", async () => {
    const cookie = await registerAndLogin("Owner", `owner2${D}`);
    await postMedia(cookie, "タイトルA", "本文です。本文です。");

    const res = await app.request("/api/media");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: Array<{ title: string }> };
    expect(body.data).toHaveLength(1);
  });

  it("news-postとmediaは互いのデータを含まない", async () => {
    const cookie = await registerAndLogin("Owner", `owner3${D}`);

    const newsFd = new FormData();
    newsFd.append("title", "ニュースタイトル");
    newsFd.append("body", "ニュース本文です。ニュース本文です。");
    await app.request("/api/news-post", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: newsFd,
    });

    await postMedia(cookie, "メディアタイトル", "メディア本文です。メディア本文です。");

    const mediaRes = await app.request("/api/media");
    const mediaBody = await mediaRes.json() as { data: Array<{ title: string }> };
    expect(mediaBody.data).toHaveLength(1);
    expect(mediaBody.data[0]?.title).toBe("メディアタイトル");

    const newsRes = await app.request("/api/news-post");
    const newsBody = await newsRes.json() as { data: Array<{ title: string }> };
    expect(newsBody.data).toHaveLength(1);
    expect(newsBody.data[0]?.title).toBe("ニュースタイトル");
  });
});

describe("GET /api/media/:id", () => {
  it("1件取得できる", async () => {
    const cookie = await registerAndLogin("Owner", `owner4${D}`);
    const postRes = await postMedia(cookie, "タイトル", "本文です。本文です。");
    const postBody = await postRes.json() as { data: { id: string } };

    const res = await app.request(`/api/media/${postBody.data.id}`);
    expect(res.status).toBe(200);
  });

  it("news-postのIDでmediaを取得すると404", async () => {
    const cookie = await registerAndLogin("Owner", `owner5${D}`);
    const newsFd = new FormData();
    newsFd.append("title", "ニュースタイトル");
    newsFd.append("body", "ニュース本文です。ニュース本文です。");
    const newsRes = await app.request("/api/news-post", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: newsFd,
    });
    const newsBody = await newsRes.json() as { data: { id: string } };

    const res = await app.request(`/api/media/${newsBody.data.id}`);
    expect(res.status).toBe(404);
  });

  it("存在しないIDは404", async () => {
    const res = await app.request("/api/media/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/media/:id", () => {
  it("owner は更新できる", async () => {
    const cookie = await registerAndLogin("Owner", `owner6${D}`);
    const postRes = await postMedia(cookie, "旧タイトル", "本文です。本文です。");
    const postBody = await postRes.json() as { data: { id: string } };

    const fd = new FormData();
    fd.append("title", "新タイトル");
    const res = await app.request(`/api/media/${postBody.data.id}`, {
      method: "PATCH",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { title: string } };
    expect(body.data.title).toBe("新タイトル");
  });

  it("member は 403", async () => {
    const ownerCookie = await registerAndLogin("Owner", `owner7${D}`);
    const memberCookie = await registerAndLogin("Member", `member7${D}`);
    const postRes = await postMedia(ownerCookie, "タイトル", "本文です。本文です。");
    const postBody = await postRes.json() as { data: { id: string } };

    const fd = new FormData();
    fd.append("title", "新タイトル");
    const res = await app.request(`/api/media/${postBody.data.id}`, {
      method: "PATCH",
      headers: { Cookie: memberCookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/media/:id", () => {
  it("owner は削除できる", async () => {
    const cookie = await registerAndLogin("Owner", `owner8${D}`);
    const postRes = await postMedia(cookie, "タイトル", "本文です。本文です。");
    const postBody = await postRes.json() as { data: { id: string } };

    const res = await app.request(`/api/media/${postBody.data.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie, Origin: ORIGIN },
    });
    expect(res.status).toBe(200);

    const getRes = await app.request(`/api/media/${postBody.data.id}`);
    expect(getRes.status).toBe(404);
  });

  it("member は 403", async () => {
    const ownerCookie = await registerAndLogin("Owner", `owner9${D}`);
    const memberCookie = await registerAndLogin("Member", `member9${D}`);
    const postRes = await postMedia(ownerCookie, "タイトル", "本文です。本文です。");
    const postBody = await postRes.json() as { data: { id: string } };

    const res = await app.request(`/api/media/${postBody.data.id}`, {
      method: "DELETE",
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/media（画像あり）", () => {
  it("画像付きで作成でき、img_url が返る", async () => {
    const cookie = await registerAndLogin("Owner", `owner10${D}`);

    const fd = mediaForm("画像付きタイトル", "本文です。本文です。");
    fd.append("image", new File([PNG_1X1], "photo.png", { type: "image/png" }));

    const res = await app.request("/api/media", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { img: string | null } };
    // S3プレフィックスは news ではなく media になる（news APIとキーが混ざらないこと）
    expect(body.data.img).toMatch(/^media\//);

    const listRes = await app.request("/api/media");
    const listBody = await listRes.json() as { data: Array<{ img_url: string | null }> };
    expect(listBody.data[0]?.img_url).toContain("media/");
  });

  it("画像以外のファイルは 400", async () => {
    const cookie = await registerAndLogin("Owner", `owner11${D}`);

    const fd = mediaForm("タイトル", "本文です。本文です。");
    fd.append("image", new File([PNG_1X1], "photo.exe", { type: "application/octet-stream" }));

    const res = await app.request("/api/media", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/media/categories", () => {
  it("カテゴリーを使用頻度順に返す（認証不要）", async () => {
    const cookie = await registerAndLogin("Owner", `owner12${D}`);
    await postMedia(cookie, "A", "本文です。本文です。", "テレビ");
    await postMedia(cookie, "B", "本文です。本文です。", "テレビ");
    await postMedia(cookie, "C", "本文です。本文です。", "新聞");

    const res = await app.request("/api/media/categories");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: Array<{ category: string; count: number }> };
    expect(body.data).toEqual([
      { category: "テレビ", count: 2 },
      { category: "新聞", count: 1 },
    ]);
  });

  it("news-post のカテゴリーは含まない", async () => {
    const cookie = await registerAndLogin("Owner", `owner13${D}`);
    await postNews(cookie, "ニュース", "ニュース本文です。ニュース本文です。", "お知らせ");
    await postMedia(cookie, "メディア", "メディア本文です。メディア本文です。", "テレビ");

    const mediaRes = await app.request("/api/media/categories");
    const mediaBody = await mediaRes.json() as { data: Array<{ category: string }> };
    expect(mediaBody.data.map((r) => r.category)).toEqual(["テレビ"]);

    const newsRes = await app.request("/api/news-post/categories");
    const newsBody = await newsRes.json() as { data: Array<{ category: string }> };
    expect(newsBody.data.map((r) => r.category)).toEqual(["お知らせ"]);
  });

  it("カテゴリー未設定の投稿は集計に含めない", async () => {
    const cookie = await registerAndLogin("Owner", `owner14${D}`);
    await postMedia(cookie, "カテゴリーなし", "本文です。本文です。");

    const res = await app.request("/api/media/categories");
    const body = await res.json() as { data: unknown[] };
    expect(body.data).toEqual([]);
  });

  it("上位5件までしか返さない", async () => {
    const cookie = await registerAndLogin("Owner", `owner15${D}`);
    for (const category of ["c1", "c2", "c3", "c4", "c5", "c6"]) {
      await postMedia(cookie, `タイトル${category}`, "本文です。本文です。", category);
    }

    const res = await app.request("/api/media/categories");
    const body = await res.json() as { data: unknown[] };
    expect(body.data).toHaveLength(5);
  });

  it(":id ルートに吸われず categories として解決される", async () => {
    const res = await app.request("/api/media/categories");
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });
});
