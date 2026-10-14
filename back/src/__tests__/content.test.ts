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

describe("GET /api/news-post — 並び順", () => {
  // created_at を明示的にずらして、並び順だけを検証する
  async function seedThree() {
    const cookie = await registerAndLogin("管理者", `order${D}`);
    for (const title of ["一番古い", "真ん中", "一番新しい"]) {
      expect((await postNews(cookie, title, "本文です。本文です。本文です。")).status).toBe(200);
    }
    await testPool.query(`UPDATE news SET created_at = NOW() - INTERVAL '3 days' WHERE title = '一番古い'`);
    await testPool.query(`UPDATE news SET created_at = NOW() - INTERVAL '2 days' WHERE title = '真ん中'`);
    await testPool.query(`UPDATE news SET created_at = NOW() - INTERVAL '1 day' WHERE title = '一番新しい'`);
  }

  async function titles(query: string) {
    const res = await app.request(`/api/news-post${query}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { data: Array<{ title: string }> };
    return body.data.map((item) => item.title);
  }

  it("未指定なら新しい順", async () => {
    await seedThree();
    expect(await titles("")).toEqual(["一番新しい", "真ん中", "一番古い"]);
  });

  it("order=asc なら古い順", async () => {
    await seedThree();
    expect(await titles("?order=asc")).toEqual(["一番古い", "真ん中", "一番新しい"]);
  });

  it("不正な order は新しい順として扱う", async () => {
    await seedThree();
    expect(await titles("?order=random")).toEqual(["一番新しい", "真ん中", "一番古い"]);
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

// --- 本文の画像 ---

// 1x1 透明PNG（実データなのでsharpでの圧縮処理を通せる）
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const pngFile = (name: string) => new File([PNG_1X1], name, { type: "image/png" });

describe("POST /api/news-post — 本文の画像", () => {
  it("images で送った画像が詳細の images に返り、サムネイルとは別に保存される", async () => {
    const cookie = await registerAndLogin("Owner", `bodyimg${D}`);
    const fd = new FormData();
    fd.append("title", "画像付きタイトル");
    fd.append("body", "画像付きの本文です。");
    fd.append("image", pngFile("thumb.png"));
    fd.append("images", pngFile("a.png"));
    fd.append("images", pngFile("b.png"));
    const res = await app.request("/api/news-post", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(200);
    const created = (await res.json()) as { data: { id: string; img: string | null } };
    expect(created.data.img).toBeTruthy();

    const detail = (await (await app.request(`/api/news-post/${created.data.id}`)).json()) as {
      data: { images: { id: string; url: string }[] };
    };
    expect(detail.data.images).toHaveLength(2);
  });

  it("本文の画像が11枚以上なら400で、投稿は作られない", async () => {
    const cookie = await registerAndLogin("Owner", `bodyimg2${D}`);
    const fd = new FormData();
    fd.append("title", "枚数超過タイトル");
    fd.append("body", "枚数超過の本文です。");
    for (let i = 0; i < 11; i++) fd.append("images", pngFile(`${i}.png`));
    const res = await app.request("/api/news-post", {
      method: "POST",
      headers: { Cookie: cookie, Origin: ORIGIN },
      body: fd,
    });
    expect(res.status).toBe(400);
    const rows = await testPool.query("SELECT id FROM news");
    expect(rows.rowCount).toBe(0);
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

// --- 問い合わせ一覧の検索・タブ件数 ---

describe("問い合わせ一覧の検索", () => {
  type ListJson = {
    data: Array<{ id: string; title: string }>;
    pagination: { total: number; totalPages: number };
    counts: { all: number; pending: number; in_progress: number; resolved: number };
  };

  /** 問い合わせを作ってIDを返す */
  async function createInquiryId(overrides: Record<string, string> = {}): Promise<string> {
    const json = (await (await postInquiry(overrides)).json()) as { data: { id: string } };
    return json.data.id;
  }

  async function list(cookie: string, query: Record<string, string>) {
    const res = await app.request(`/api/inquiry?${new URLSearchParams(query)}`, {
      headers: { Cookie: cookie },
    });
    return { status: res.status, json: (await res.json()) as ListJson };
  }

  async function patchStatus(cookie: string, id: string, status: string) {
    return app.request(`/api/inquiry/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: ORIGIN },
      body: JSON.stringify({ status }),
    });
  }

  it("名前・メールアドレス・件名・本文を部分一致（大文字小文字を区別しない）で検索できる", async () => {
    const cookie = await registerAndLogin("Owner", `search-owner${D}`);
    const byName = await createInquiryId({ name: "山田 太郎" });
    const byEmail = await createInquiryId({ email: "Yamada.Hanako@example.com" });
    const byTitle = await createInquiryId({ title: "練習場所について" });
    const byBody = await createInquiryId({ body: "見学は可能ですか？" });

    const ids = async (q: string) => (await list(cookie, { q })).json.data.map((d) => d.id);
    expect(await ids("山田")).toEqual([byName]);
    expect(await ids("yamada.hanako")).toEqual([byEmail]);
    expect(await ids("練習場所")).toEqual([byTitle]);
    expect(await ids("見学")).toEqual([byBody]);
    expect((await list(cookie, { q: "該当なし" })).json.pagination.total).toBe(0);
  });

  it("% _ \\ はワイルドカードではなく文字として検索する", async () => {
    const cookie = await registerAndLogin("Owner", `search-owner2${D}`);
    const percent = await createInquiryId({ title: "割引は50%ですか" });
    const underscore = await createInquiryId({ title: "a_b について" });
    const backslash = await createInquiryId({ title: "C:\\path について" });
    await createInquiryId({ title: "ab について" });

    const ids = async (q: string) => (await list(cookie, { q })).json.data.map((d) => d.id);
    expect(await ids("%")).toEqual([percent]);
    expect(await ids("a_b")).toEqual([underscore]);
    expect(await ids("_")).toEqual([underscore]);
    expect(await ids("\\")).toEqual([backslash]);
  });

  it("空白だけの検索語は検索しない", async () => {
    const cookie = await registerAndLogin("Owner", `search-owner3${D}`);
    await createInquiryId();
    await createInquiryId();
    expect((await list(cookie, { q: "  " })).json.pagination.total).toBe(2);
  });

  it("101文字以上の検索語は400", async () => {
    const cookie = await registerAndLogin("Owner", `search-owner4${D}`);
    expect((await list(cookie, { q: "あ".repeat(101) })).status).toBe(400);
  });

  it("status と併用でき、件数とページ数は両方の条件で数える", async () => {
    const cookie = await registerAndLogin("Owner", `search-owner5${D}`);
    const ids: string[] = [];
    for (let i = 0; i < 12; i++) ids.push(await createInquiryId({ title: `体験の申し込み${i}` }));
    await createInquiryId({ title: "別件" });
    for (const id of ids.slice(0, 11)) await patchStatus(cookie, id, "resolved");

    const page1 = await list(cookie, { q: "体験", status: "resolved" });
    expect(page1.json.pagination).toMatchObject({ total: 11, totalPages: 2 });
    expect(page1.json.data).toHaveLength(10);
    const page2 = await list(cookie, { q: "体験", status: "resolved", page: "2" });
    expect(page2.json.data).toHaveLength(1);
    expect(page2.json.data[0]?.title).toMatch(/^体験の申し込み/);

    const pending = await list(cookie, { q: "体験", status: "pending" });
    expect(pending.json.data.map((d) => d.id)).toEqual([ids[11]]);
  });

  it("counts は検索条件だけで数えたステータスごとの件数（status の絞り込みには左右されない）", async () => {
    const cookie = await registerAndLogin("Owner", `search-owner6${D}`);
    const a = await createInquiryId({ title: "体験A" });
    const b = await createInquiryId({ title: "体験B" });
    await createInquiryId({ title: "体験C" });
    await createInquiryId({ title: "別件" });
    await patchStatus(cookie, a, "in_progress");
    await patchStatus(cookie, b, "resolved");

    const expected = { all: 3, pending: 1, in_progress: 1, resolved: 1 };
    expect((await list(cookie, { q: "体験" })).json.counts).toEqual(expected);
    expect((await list(cookie, { q: "体験", status: "resolved" })).json.counts).toEqual(expected);
    expect((await list(cookie, {})).json.counts).toEqual({ ...expected, all: 4, pending: 2 });
  });
});
