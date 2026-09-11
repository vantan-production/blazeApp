// 資料庫・投稿申請・通知設定（Phase 4）統合テスト

import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { cleanDb } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";

const D = "@phase4.test";
const ORIGIN = "http://localhost:3000";

beforeEach(async () => {
  await cleanDb();
});

const setupOwner = () => registerAndLogin("Owner", `owner${D}`);
const setupMember = () => registerAndLogin("Member", `member${D}`);

const json = (cookie: string) => ({
  "Content-Type": "application/json",
  Cookie: cookie,
});

// --- E. 資料庫 ---

describe("資料庫", () => {
  /** 資料を登録して ID を返す */
  async function postDocument(cookie: string, title = "チーム規約", withFile = true) {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", "2026年度版");
    if (withFile) {
      fd.append("file", new File(["dummy pdf"], "rules.pdf", { type: "application/pdf" }));
    }

    const res = await app.request("/api/documents", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    const body = (await res.json()) as { data?: { id: string } };
    return { status: res.status, id: body.data?.id ?? "" };
  }

  it("admin は資料を登録できる", async () => {
    const cookie = await setupOwner();
    const { status, id } = await postDocument(cookie);
    expect(status).toBe(200);
    expect(id).toBeTruthy();
  });

  it("ファイルなしは 400", async () => {
    const cookie = await setupOwner();
    const { status } = await postDocument(cookie, "ファイルなし", false);
    expect(status).toBe(400);
  });

  it("member は登録できない", async () => {
    await setupOwner();
    const memberCookie = await setupMember();
    const { status } = await postDocument(memberCookie);
    expect(status).toBe(403);
  });

  it("member は一覧を取得できる", async () => {
    const ownerCookie = await setupOwner();
    await postDocument(ownerCookie);
    const memberCookie = await setupMember();

    const res = await app.request("/api/documents", {
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: Array<{ title: string; file_name: string; has_file: boolean }>;
    };
    expect(body.data[0]?.title).toBe("チーム規約");
    expect(body.data[0]?.has_file).toBe(true);
    expect(body.data[0]?.file_name).toContain("rules.pdf");
  });

  it("未ログインは 401", async () => {
    expect((await app.request("/api/documents")).status).toBe(401);
  });

  it("member はダウンロードURLを取得できる", async () => {
    const ownerCookie = await setupOwner();
    const { id } = await postDocument(ownerCookie);
    const memberCookie = await setupMember();

    const res = await app.request(`/api/documents/${id}/download`, {
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: { url: string; expires_in: number };
    };
    expect(body.data.url).toContain("documents/");
    expect(body.data.expires_in).toBe(300);
  });

  it("タイトルを更新できる", async () => {
    const cookie = await setupOwner();
    const { id } = await postDocument(cookie);

    const fd = new FormData();
    fd.append("title", "チーム規約 2027年度版");
    const res = await app.request(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(200);

    const list = await app.request("/api/documents", { headers: { Cookie: cookie } });
    const body = (await list.json()) as { data: Array<{ title: string }> };
    expect(body.data[0]?.title).toBe("チーム規約 2027年度版");
  });

  it("削除できる", async () => {
    const cookie = await setupOwner();
    const { id } = await postDocument(cookie);

    const res = await app.request(`/api/documents/${id}`, {
      method: "DELETE",
      headers: json(cookie),
    });
    expect(res.status).toBe(200);

    const download = await app.request(`/api/documents/${id}/download`, {
      headers: { Cookie: cookie },
    });
    expect(download.status).toBe(404);
  });
});

// --- F. 投稿申請 ---

describe("投稿申請", () => {
  /** 投稿を申請して ID を返す */
  async function submit(cookie: string, title = "遠征の報告") {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("body", "本文です");

    const res = await app.request("/api/submissions", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    const body = (await res.json()) as { data?: { id: string; status: string } };
    return { status: res.status, id: body.data?.id ?? "", postStatus: body.data?.status };
  }

  it("member の申請は pending になる", async () => {
    await setupOwner();
    const memberCookie = await setupMember();
    const { status, postStatus } = await submit(memberCookie);
    expect(status).toBe(200);
    expect(postStatus).toBe("pending");
  });

  it("承認前は公開ニュース一覧に出ない", async () => {
    await setupOwner();
    const memberCookie = await setupMember();
    await submit(memberCookie);

    const res = await app.request("/api/news-post");
    const body = (await res.json()) as { pagination: { total: number } };
    expect(body.pagination.total).toBe(0);
  });

  it("承認前でも申請者本人は詳細を見られる", async () => {
    await setupOwner();
    const memberCookie = await setupMember();
    const { id } = await submit(memberCookie);

    expect((await app.request(`/api/news-post/${id}`)).status).toBe(404);

    const res = await app.request(`/api/news-post/${id}`, {
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(200);
  });

  it("承認すると公開される", async () => {
    const ownerCookie = await setupOwner();
    const memberCookie = await setupMember();
    const { id } = await submit(memberCookie);

    const res = await app.request(`/api/submissions/${id}/approve`, {
      method: "PATCH",
      headers: json(ownerCookie),
    });
    expect(res.status).toBe(200);

    const list = await app.request("/api/news-post");
    const body = (await list.json()) as { pagination: { total: number } };
    expect(body.pagination.total).toBe(1);
  });

  it("差し戻すと draft になり公開されない", async () => {
    const ownerCookie = await setupOwner();
    const memberCookie = await setupMember();
    const { id } = await submit(memberCookie);

    const res = await app.request(`/api/submissions/${id}/reject`, {
      method: "PATCH",
      headers: json(ownerCookie),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string } };
    expect(body.data.status).toBe("draft");

    const list = await app.request("/api/news-post");
    const listBody = (await list.json()) as { pagination: { total: number } };
    expect(listBody.pagination.total).toBe(0);
  });

  it("対応済みの申請は再度対応できない", async () => {
    const ownerCookie = await setupOwner();
    const memberCookie = await setupMember();
    const { id } = await submit(memberCookie);

    const approve = () =>
      app.request(`/api/submissions/${id}/approve`, {
        method: "PATCH",
        headers: json(ownerCookie),
      });

    expect((await approve()).status).toBe(200);
    expect((await approve()).status).toBe(400);
  });

  it("承認待ち一覧は admin 以上のみ", async () => {
    const ownerCookie = await setupOwner();
    const memberCookie = await setupMember();
    await submit(memberCookie);

    expect(
      (await app.request("/api/submissions/pending", { headers: { Cookie: memberCookie } }))
        .status,
    ).toBe(403);

    const res = await app.request("/api/submissions/pending", {
      headers: { Cookie: ownerCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { pagination: { total: number } };
    expect(body.pagination.total).toBe(1);
  });

  it("自分の申請一覧を取得できる", async () => {
    await setupOwner();
    const memberCookie = await setupMember();
    await submit(memberCookie, "申請A");

    const res = await app.request("/api/submissions", {
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ title: string }> };
    expect(body.data[0]?.title).toBe("申請A");
  });

  it("admin が通常投稿したニュースは即公開される", async () => {
    const ownerCookie = await setupOwner();

    const fd = new FormData();
    fd.append("title", "管理者の投稿");
    fd.append("body", "本文");
    await app.request("/api/news-post", {
      method: "POST",
      headers: { Cookie: ownerCookie, Origin: ORIGIN },
      body: fd,
    });

    const res = await app.request("/api/news-post");
    const body = (await res.json()) as { pagination: { total: number } };
    expect(body.pagination.total).toBe(1);
  });

  it("未ログインは申請できない", async () => {
    const fd = new FormData();
    fd.append("title", "x");
    fd.append("body", "y");
    const res = await app.request("/api/submissions", {
      method: "POST",
      headers: { Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(401);
  });
});

// --- G. 通知設定 ---

describe("通知設定", () => {
  it("既定ではどちらも有効", async () => {
    const cookie = await setupOwner();
    const res = await app.request("/api/notification-settings", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: { notice_email: boolean; survey_email: boolean };
    };
    expect(body.data).toEqual({ notice_email: true, survey_email: true });
  });

  it("片方だけ無効にできる", async () => {
    const cookie = await setupOwner();

    const res = await app.request("/api/notification-settings", {
      method: "PATCH",
      headers: json(cookie),
      body: JSON.stringify({ notice_email: false }),
    });
    expect(res.status).toBe(200);

    const get = await app.request("/api/notification-settings", {
      headers: { Cookie: cookie },
    });
    const body = (await get.json()) as {
      data: { notice_email: boolean; survey_email: boolean };
    };
    expect(body.data.notice_email).toBe(false);
    expect(body.data.survey_email).toBe(true);
  });

  it("2回目の変更でもう片方だけ変えられる", async () => {
    const cookie = await setupOwner();

    for (const patch of [{ notice_email: false }, { survey_email: false }]) {
      await app.request("/api/notification-settings", {
        method: "PATCH",
        headers: json(cookie),
        body: JSON.stringify(patch),
      });
    }

    const get = await app.request("/api/notification-settings", {
      headers: { Cookie: cookie },
    });
    const body = (await get.json()) as {
      data: { notice_email: boolean; survey_email: boolean };
    };
    expect(body.data).toEqual({ notice_email: false, survey_email: false });
  });

  it("設定は利用者ごとに独立している", async () => {
    const ownerCookie = await setupOwner();
    const memberCookie = await setupMember();

    await app.request("/api/notification-settings", {
      method: "PATCH",
      headers: json(memberCookie),
      body: JSON.stringify({ notice_email: false }),
    });

    const res = await app.request("/api/notification-settings", {
      headers: { Cookie: ownerCookie },
    });
    const body = (await res.json()) as { data: { notice_email: boolean } };
    expect(body.data.notice_email).toBe(true);
  });

  it("空のリクエストは 400", async () => {
    const cookie = await setupOwner();
    const res = await app.request("/api/notification-settings", {
      method: "PATCH",
      headers: json(cookie),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("未ログインは 401", async () => {
    expect((await app.request("/api/notification-settings")).status).toBe(401);
  });
});
