// 関係者限定お知らせ・公開範囲（Phase 1）統合テスト
//
// 特に重要なのは「visibility='member' の記事が公開APIから漏れないこと」（設計書 §7 ★注意）。

import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { cleanDb } from "./setup.js";
import { registerAndLogin, getUsers } from "./testHelpers.js";

const D = "@notice.test";
const ORIGIN = "http://localhost:3000";

beforeEach(async () => {
  await cleanDb();
});

/** owner を作って Cookie を返す */
const setupOwner = () => registerAndLogin("Owner", `owner${D}`);

/** member を作って Cookie を返す（owner が既に居ること） */
const setupMember = () => registerAndLogin("Member", `member${D}`);

/** お知らせを投稿して ID を返す */
async function postNotice(cookie: string, title: string, body = "本文です") {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("body", body);

  const res = await app.request("/api/notices", {
    method: "POST",
    headers: { Cookie: cookie, Origin: ORIGIN },
    body: fd,
  });
  if (res.status !== 200) {
    throw new Error(`postNotice failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data: { id: string; visibility: string } };
  return json.data;
}

/** ニュースを投稿して ID を返す */
async function postNews(cookie: string, title: string, visibility?: "public" | "member") {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("body", "本文です");
  if (visibility) fd.append("visibility", visibility);

  const res = await app.request("/api/news-post", {
    method: "POST",
    headers: { Cookie: cookie, Origin: ORIGIN },
    body: fd,
  });
  if (res.status !== 200) {
    throw new Error(`postNews failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data: { id: string; visibility: string } };
  return json.data;
}

// --- 公開範囲フィルタ（既存APIへの影響） ---

describe("公開APIの visibility フィルタ", () => {
  it("未ログインの一覧には member 限定記事が出ない", async () => {
    const cookie = await setupOwner();
    await postNews(cookie, "公開ニュース", "public");
    await postNews(cookie, "関係者限定ニュース", "member");

    const res = await app.request("/api/news-post");
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: Array<{ title: string }>;
      pagination: { total: number };
    };
    expect(body.pagination.total).toBe(1);
    expect(body.data.map((n) => n.title)).toEqual(["公開ニュース"]);
  });

  it("ログイン済みの一覧には member 限定記事も出る", async () => {
    const ownerCookie = await setupOwner();
    await postNews(ownerCookie, "公開ニュース", "public");
    await postNews(ownerCookie, "関係者限定ニュース", "member");
    const memberCookie = await setupMember();

    const res = await app.request("/api/news-post", {
      headers: { Cookie: memberCookie },
    });
    const body = (await res.json()) as { pagination: { total: number } };
    expect(body.pagination.total).toBe(2);
  });

  it("未ログインが member 限定記事を直接引くと 404", async () => {
    const cookie = await setupOwner();
    const created = await postNews(cookie, "関係者限定ニュース", "member");

    const res = await app.request(`/api/news-post/${created.id}`);
    expect(res.status).toBe(404);
  });

  it("member は member 限定記事を直接引ける", async () => {
    const ownerCookie = await setupOwner();
    const created = await postNews(ownerCookie, "関係者限定ニュース", "member");
    const memberCookie = await setupMember();

    const res = await app.request(`/api/news-post/${created.id}`, {
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(200);
  });

  it("visibility を指定しない投稿は public になる", async () => {
    const cookie = await setupOwner();
    const created = await postNews(cookie, "既定のニュース");
    expect(created.visibility).toBe("public");
  });

  it("お知らせ（type=notice）は公開ニュース一覧に出ない", async () => {
    const cookie = await setupOwner();
    await postNotice(cookie, "事務連絡");

    const res = await app.request("/api/news-post");
    const body = (await res.json()) as { pagination: { total: number } };
    expect(body.pagination.total).toBe(0);
  });
});

// --- お知らせ本体 ---

describe("GET /api/notices", () => {
  it("member は一覧を取得できる", async () => {
    const ownerCookie = await setupOwner();
    await postNotice(ownerCookie, "事務連絡1");
    const memberCookie = await setupMember();

    const res = await app.request("/api/notices", {
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: Array<{ title: string; is_read: boolean }>;
    };
    expect(body.data[0]?.title).toBe("事務連絡1");
    expect(body.data[0]?.is_read).toBe(false);
  });

  it("未ログインは 401", async () => {
    const cookie = await setupOwner();
    await postNotice(cookie, "事務連絡");
    expect((await app.request("/api/notices")).status).toBe(401);
  });

  it("投稿は admin 以上に限られる", async () => {
    await setupOwner();
    const memberCookie = await setupMember();

    const fd = new FormData();
    fd.append("title", "member の投稿");
    fd.append("body", "本文");

    const res = await app.request("/api/notices", {
      method: "POST",
      headers: { Cookie: memberCookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(403);
  });

  it("お知らせは常に visibility='member' で作られる", async () => {
    const cookie = await setupOwner();
    const created = await postNotice(cookie, "事務連絡");
    expect(created.visibility).toBe("member");
  });
});

// --- 既読管理 ---

describe("既読管理", () => {
  it("既読をつけると is_read が true になる", async () => {
    const ownerCookie = await setupOwner();
    const notice = await postNotice(ownerCookie, "事務連絡");
    const memberCookie = await setupMember();

    const readRes = await app.request(`/api/notices/${notice.id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: memberCookie },
    });
    expect(readRes.status).toBe(200);

    const listRes = await app.request("/api/notices", {
      headers: { Cookie: memberCookie },
    });
    const body = (await listRes.json()) as { data: Array<{ is_read: boolean }> };
    expect(body.data[0]?.is_read).toBe(true);
  });

  it("2回既読にしても初回の日時が保たれる", async () => {
    const ownerCookie = await setupOwner();
    const notice = await postNotice(ownerCookie, "事務連絡");
    const memberCookie = await setupMember();

    const first = await app.request(`/api/notices/${notice.id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: memberCookie },
    });
    const firstBody = (await first.json()) as { data: { read_at: string } };

    const second = await app.request(`/api/notices/${notice.id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: memberCookie },
    });
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { data: { read_at: string } };

    expect(secondBody.data.read_at).toBe(firstBody.data.read_at);
  });

  it("既読は利用者ごとに独立している", async () => {
    const ownerCookie = await setupOwner();
    const notice = await postNotice(ownerCookie, "事務連絡");
    const memberCookie = await setupMember();

    await app.request(`/api/notices/${notice.id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: memberCookie },
    });

    const ownerList = await app.request("/api/notices", {
      headers: { Cookie: ownerCookie },
    });
    const body = (await ownerList.json()) as { data: Array<{ is_read: boolean }> };
    expect(body.data[0]?.is_read).toBe(false);
  });

  it("存在しないお知らせの既読は 404", async () => {
    const cookie = await setupOwner();
    const res = await app.request(
      "/api/notices/00000000-0000-0000-0000-000000000000/read",
      { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie } },
    );
    expect(res.status).toBe(404);
  });
});

// --- 既読状況（未読者の把握） ---

describe("GET /api/notices/:id/reads", () => {
  it("既読者と未読者を返す", async () => {
    const ownerCookie = await setupOwner();
    const notice = await postNotice(ownerCookie, "事務連絡");
    const memberCookie = await setupMember();

    await app.request(`/api/notices/${notice.id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: memberCookie },
    });

    const res = await app.request(`/api/notices/${notice.id}/reads`, {
      headers: { Cookie: ownerCookie },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: {
        total: number;
        read_count: number;
        unread_count: number;
        read: Array<{ email: string }>;
        unread: Array<{ email: string }>;
      };
    };
    expect(body.data.total).toBe(2);
    expect(body.data.read_count).toBe(1);
    expect(body.data.unread_count).toBe(1);
    expect(body.data.read[0]?.email).toBe(`member${D}`);
    expect(body.data.unread[0]?.email).toBe(`owner${D}`);
  });

  it("member は 403", async () => {
    const ownerCookie = await setupOwner();
    const notice = await postNotice(ownerCookie, "事務連絡");
    const memberCookie = await setupMember();

    const res = await app.request(`/api/notices/${notice.id}/reads`, {
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(403);
  });

  it("admin は閲覧できる", async () => {
    const ownerCookie = await setupOwner();
    const notice = await postNotice(ownerCookie, "事務連絡");
    const memberCookie = await registerAndLogin("Admin", `admin${D}`);

    const users = await getUsers(ownerCookie);
    const adminId = users.find((u) => u.email === `admin${D}`)?.id;
    await app.request(`/api/admin/users/${adminId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ role: "admin" }),
    });

    const res = await app.request(`/api/notices/${notice.id}/reads`, {
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(200);
  });
});
