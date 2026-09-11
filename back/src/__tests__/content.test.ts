// コンテンツ API 統合テスト（admin_name表示・権限確認）
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { cleanDb, testPool } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";

const D = "@content.test";

beforeEach(async () => {
  await cleanDb();
});

const ORIGIN = "http://localhost:3000";

async function postNews(cookie: string, title: string, body: string) {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("body", body);
  return app.request("/api/news-post", {
    method: "POST",
    headers: { Cookie: cookie, Origin: ORIGIN },
    body: fd,
  });
}

// --- admin_name ---

describe("GET /api/news-post — admin_name", () => {
  it("投稿者名が admin_name として返る", async () => {
    const cookie = await registerAndLogin("テスト管理者", `news${D}`);
    expect((await postNews(cookie, "テストタイトル", "テスト本文です。テスト本文です。")).status).toBe(200);

    const res = await app.request("/api/news-post");
    expect(res.status).toBe(200);
    const body = await res.json() as { data: Array<{ admin_name: string }> };
    expect(body.data[0]?.admin_name).toBe("テスト管理者");
  });

  it("admin_id が null（削除済み管理者）のとき「元管理者」が返る", async () => {
    const cookie = await registerAndLogin("削除予定管理者", `todelete${D}`);
    expect((await postNews(cookie, "テストタイトル", "テスト本文です。テスト本文です。")).status).toBe(200);

    await testPool.query(`UPDATE news SET admin_id = NULL`);

    const res = await app.request("/api/news-post");
    const body = await res.json() as { data: Array<{ admin_name: string }> };
    expect(body.data[0]?.admin_name).toBe("元管理者");
  });
});

describe("GET /api/news-post/:id — admin_name", () => {
  it("1件取得でも admin_name が返る", async () => {
    const cookie = await registerAndLogin("管理者", `single${D}`);
    const postRes = await postNews(cookie, "タイトル", "本文です。本文です。本文です。");
    const postBody = await postRes.json() as { data: { id: string } };

    const res = await app.request(`/api/news-post/${postBody.data.id}`);
    expect(res.status).toBe(200);
    expect((await res.json() as { data: { admin_name: string } }).data.admin_name).toBe("管理者");
  });
});

// --- 書き込み権限 ---

describe("ニュース書き込み権限", () => {
  it("owner はニュース投稿可能", async () => {
    const cookie = await registerAndLogin("Owner", `owner${D}`);
    expect((await postNews(cookie, "ownerタイトル", "ownerの本文です。ownerの本文です。")).status).toBe(200);
  });

  it("member はニュース投稿 403", async () => {
    await registerAndLogin("Owner", `owner${D}`);
    const memberCookie = await registerAndLogin("Member", `member${D}`);
    expect((await postNews(memberCookie, "memberタイトル", "memberの本文。")).status).toBe(403);
  });

  it("認証なしはニュース投稿 401", async () => {
    const fd = new FormData();
    fd.append("title", "タイトル");
    fd.append("body", "本文です。");
    expect(
      (await app.request("/api/news-post", { method: "POST", headers: { Origin: ORIGIN }, body: fd })).status,
    ).toBe(401);
  });
});

// --- 問い合わせ権限 ---

/** 問い合わせを1件送信する */
async function postInquiry(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.append("name", overrides.name ?? "お客様");
  fd.append("email", overrides.email ?? "customer@example.com");
  fd.append("title", overrides.title ?? "お問い合わせタイトル");
  fd.append("body", overrides.body ?? "お問い合わせ本文です。");
  return app.request("/api/inquiry", { method: "POST", headers: { Origin: ORIGIN }, body: fd });
}

describe("問い合わせ権限", () => {
  it("誰でも問い合わせ送信可能", async () => {
    expect((await postInquiry()).status).toBe(200);
  });

  it("メールアドレスがないと400", async () => {
    const fd = new FormData();
    fd.append("name", "お客様");
    fd.append("title", "お問い合わせタイトル");
    fd.append("body", "お問い合わせ本文です。");
    expect(
      (await app.request("/api/inquiry", { method: "POST", headers: { Origin: ORIGIN }, body: fd })).status,
    ).toBe(400);
  });

  it("問い合わせ一覧は認証が必要", async () => {
    expect((await app.request("/api/inquiry")).status).toBe(401);
  });

  it("owner は問い合わせ一覧を取得できる", async () => {
    const cookie = await registerAndLogin("Owner", `owner2${D}`);
    expect((await app.request("/api/inquiry", { headers: { Cookie: cookie } })).status).toBe(200);
  });
});

// --- 問い合わせ対応ステータス ---

describe("問い合わせ対応ステータス", () => {
  /** 問い合わせを1件作ってそのIDを返す */
  async function createInquiryId(): Promise<string> {
    const res = await postInquiry();
    const json = (await res.json()) as { data: { id: string } };
    return json.data.id;
  }

  /** 対応ステータスを更新する */
  async function patchStatus(cookie: string, id: string, status: string) {
    return app.request(`/api/inquiry/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: ORIGIN },
      body: JSON.stringify({ status }),
    });
  }

  it("送信直後は未対応（pending）", async () => {
    const res = await postInquiry();
    const json = (await res.json()) as { data: { status: string } };
    expect(json.data.status).toBe("pending");
  });

  it("admin は対応中・対応済みに更新できる", async () => {
    const cookie = await registerAndLogin("Owner", `status-owner${D}`);
    const id = await createInquiryId();

    for (const status of ["in_progress", "resolved"]) {
      const res = await patchStatus(cookie, id, status);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { data: { status: string } };
      expect(json.data.status).toBe(status);
    }
  });

  it("不正なステータスは400", async () => {
    const cookie = await registerAndLogin("Owner", `status-owner2${D}`);
    const id = await createInquiryId();
    expect((await patchStatus(cookie, id, "完了")).status).toBe(400);
  });

  it("存在しないIDは404", async () => {
    const cookie = await registerAndLogin("Owner", `status-owner3${D}`);
    const res = await patchStatus(cookie, "00000000-0000-0000-0000-000000000000", "resolved");
    expect(res.status).toBe(404);
  });

  it("認証なしのステータス更新は401", async () => {
    const id = await createInquiryId();
    const res = await app.request(`/api/inquiry/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ status: "resolved" }),
    });
    expect(res.status).toBe(401);
  });

  it("一覧を status で絞り込める", async () => {
    const cookie = await registerAndLogin("Owner", `status-owner4${D}`);
    const resolvedId = await createInquiryId();
    await createInquiryId();
    await patchStatus(cookie, resolvedId, "resolved");

    const res = await app.request("/api/inquiry?status=resolved", { headers: { Cookie: cookie } });
    const json = (await res.json()) as {
      data: Array<{ id: string; status: string }>;
      pagination: { total: number };
    };
    expect(json.pagination.total).toBe(1);
    expect(json.data[0]?.id).toBe(resolvedId);

    const pendingRes = await app.request("/api/inquiry?status=pending", {
      headers: { Cookie: cookie },
    });
    const pendingJson = (await pendingRes.json()) as { pagination: { total: number } };
    expect(pendingJson.pagination.total).toBe(1);
  });

  it("不正な status クエリは400", async () => {
    const cookie = await registerAndLogin("Owner", `status-owner5${D}`);
    const res = await app.request("/api/inquiry?status=完了", { headers: { Cookie: cookie } });
    expect(res.status).toBe(400);
  });
});
