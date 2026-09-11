// 招待（Phase 0）統合テスト
// 自己登録が塞がれていること、招待の発行・確認・失効が owner に限られることを検証する。

import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { cleanDb, testDb } from "./setup.js";
import { registerAndLogin, seedInvitation, login } from "./testHelpers.js";
import { invitations } from "../db/schema.js";
import { hashToken } from "../db/token.js";
import { eq } from "drizzle-orm";

const D = "@invitation.test";
const PW = "Test@Password1!";

beforeEach(async () => {
  await cleanDb();
});

/** owner を作って Cookie を返す */
const setupOwner = () => registerAndLogin("Owner", `owner${D}`);

/** 招待を発行して生トークンを返す（テスト環境ではレスポンスに含まれる） */
async function issueInvitation(
  ownerCookie: string,
  email: string,
  role: "admin" | "member" = "member",
) {
  const res = await app.request("/api/admin/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ownerCookie },
    body: JSON.stringify({ email, role }),
  });
  const body = (await res.json()) as {
    success: boolean;
    data?: { token?: string; role?: string; expires_at?: string };
  };
  return { status: res.status, body };
}

// --- 発行 ---

describe("POST /api/admin/invitations", () => {
  it("owner は招待を発行できる", async () => {
    const cookie = await setupOwner();
    const { status, body } = await issueInvitation(cookie, `invited${D}`);

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.role).toBe("member");
    expect(body.data?.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("未ログインは 401", async () => {
    await setupOwner();
    const res = await app.request("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `x${D}`, role: "member" }),
    });
    expect(res.status).toBe(401);
  });

  it("member は 403", async () => {
    await setupOwner();
    const memberCookie = await registerAndLogin("Member", `member${D}`);
    const { status } = await issueInvitation(memberCookie, `x${D}`);
    expect(status).toBe(403);
  });

  it("role に owner は指定できない", async () => {
    const cookie = await setupOwner();
    const res = await app.request("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ email: `x${D}`, role: "owner" }),
    });
    expect(res.status).toBe(400);
  });

  it("登録済みのメールアドレスは 409", async () => {
    const cookie = await setupOwner();
    const { status } = await issueInvitation(cookie, `owner${D}`);
    expect(status).toBe(409);
  });

  it("同じ宛先に再発行すると古い招待は使えなくなる", async () => {
    const cookie = await setupOwner();
    const first = await issueInvitation(cookie, `resend${D}`);
    const second = await issueInvitation(cookie, `resend${D}`);

    const oldToken = first.body.data?.token ?? "";
    const newToken = second.body.data?.token ?? "";
    expect(oldToken).not.toBe(newToken);

    const oldRes = await app.request(
      `/api/admin/invitations/verify?token=${oldToken}`,
    );
    expect(oldRes.status).toBe(400);

    const newRes = await app.request(
      `/api/admin/invitations/verify?token=${newToken}`,
    );
    expect(newRes.status).toBe(200);
  });
});

// --- 有効性確認 ---

describe("GET /api/admin/invitations/verify", () => {
  it("有効な招待は宛先とロールを返す（認証不要）", async () => {
    const cookie = await setupOwner();
    const { body } = await issueInvitation(cookie, `verify${D}`, "admin");

    const res = await app.request(
      `/api/admin/invitations/verify?token=${body.data?.token}`,
    );
    expect(res.status).toBe(200);

    const verified = (await res.json()) as {
      data: { email: string; role: string };
    };
    expect(verified.data.email).toBe(`verify${D}`);
    expect(verified.data.role).toBe("admin");
  });

  it("形式が不正なトークンは 400", async () => {
    const res = await app.request("/api/admin/invitations/verify?token=notahex");
    expect(res.status).toBe(400);
  });

  it("存在しないトークンは 400", async () => {
    const res = await app.request(
      `/api/admin/invitations/verify?token=${"a".repeat(64)}`,
    );
    expect(res.status).toBe(400);
  });

  it("期限切れの招待は 400", async () => {
    await setupOwner();
    const token = await seedInvitation(`expired${D}`);

    // 有効期限を過去に倒す
    await testDb
      .update(invitations)
      .set({ expires_at: new Date(Date.now() - 1000) })
      .where(eq(invitations.token_hash, hashToken(token)));

    const res = await app.request(`/api/admin/invitations/verify?token=${token}`);
    expect(res.status).toBe(400);
  });

  it("使用済みの招待は 400", async () => {
    await setupOwner();
    const token = await seedInvitation(`used${D}`);

    const regRes = await app.request("/api/admin/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        name: "Used",
        email: `used${D}`,
        password: PW,
        passwordConfirmation: PW,
      }),
    });
    expect(regRes.status).toBe(200);

    const res = await app.request(`/api/admin/invitations/verify?token=${token}`);
    expect(res.status).toBe(400);
  });
});

// --- 一覧 ---

describe("GET /api/admin/invitations", () => {
  it("owner は一覧を取得でき、トークンハッシュは含まれない", async () => {
    const cookie = await setupOwner();
    await issueInvitation(cookie, `list1${D}`);
    await issueInvitation(cookie, `list2${D}`, "admin");

    const res = await app.request("/api/admin/invitations", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      total: number;
      data: Array<Record<string, unknown>>;
    };
    expect(body.total).toBe(2);
    expect(body.data[0]).not.toHaveProperty("token_hash");
    expect(body.data.map((i) => i.status)).toEqual(["pending", "pending"]);
  });

  it("登録後は status が used になる", async () => {
    const cookie = await setupOwner();
    await registerAndLogin("Member", `member${D}`);

    const res = await app.request("/api/admin/invitations", {
      headers: { Cookie: cookie },
    });
    const body = (await res.json()) as { data: Array<{ email: string; status: string }> };
    expect(body.data.find((i) => i.email === `member${D}`)?.status).toBe("used");
  });

  it("member は 403", async () => {
    await setupOwner();
    const memberCookie = await registerAndLogin("Member", `member${D}`);
    const res = await app.request("/api/admin/invitations", {
      headers: { Cookie: memberCookie },
    });
    expect(res.status).toBe(403);
  });
});

// --- 失効 ---

describe("DELETE /api/admin/invitations/:id", () => {
  it("未使用の招待を失効できる", async () => {
    const cookie = await setupOwner();
    const { body } = await issueInvitation(cookie, `revoke${D}`);
    const token = body.data?.token ?? "";

    const listRes = await app.request("/api/admin/invitations", {
      headers: { Cookie: cookie },
    });
    const list = (await listRes.json()) as { data: Array<{ id: string }> };
    const id = list.data[0]?.id;

    const res = await app.request(`/api/admin/invitations/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Cookie: cookie },
    });
    expect(res.status).toBe(200);

    // 失効後はリンクが使えない
    const verifyRes = await app.request(
      `/api/admin/invitations/verify?token=${token}`,
    );
    expect(verifyRes.status).toBe(400);
  });

  it("使用済みの招待は失効できない", async () => {
    const cookie = await setupOwner();
    await registerAndLogin("Member", `member${D}`);

    const listRes = await app.request("/api/admin/invitations", {
      headers: { Cookie: cookie },
    });
    const list = (await listRes.json()) as { data: Array<{ id: string; status: string }> };
    const used = list.data.find((i) => i.status === "used");
    expect(used).toBeTruthy();

    const res = await app.request(`/api/admin/invitations/${used?.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Cookie: cookie },
    });
    expect(res.status).toBe(400);
  });

  it("存在しないIDは 404", async () => {
    const cookie = await setupOwner();
    const res = await app.request(
      "/api/admin/invitations/00000000-0000-0000-0000-000000000000",
      { method: "DELETE", headers: { "Content-Type": "application/json", Cookie: cookie } },
    );
    expect(res.status).toBe(404);
  });

  it("member は 403", async () => {
    const ownerCookie = await setupOwner();
    const memberCookie = await registerAndLogin("Member", `member${D}`);

    const listRes = await app.request("/api/admin/invitations", {
      headers: { Cookie: ownerCookie },
    });
    const list = (await listRes.json()) as { data: Array<{ id: string }> };

    const res = await app.request(`/api/admin/invitations/${list.data[0]?.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Cookie: memberCookie },
    });
    expect(res.status).toBe(403);
  });
});

// --- 初回 owner の作成 ---

describe("最初の owner", () => {
  it("owner が居ない状態では招待なしで作成され、ログインできる", async () => {
    const cookie = await setupOwner();
    const res = await app.request("/api/admin/users", { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: Array<{ email: string; role: string }> };
    expect(body.data.find((u) => u.email === `owner${D}`)?.role).toBe("owner");
  });

  it("owner が既に居る場合は作成しない", async () => {
    await setupOwner();
    const { createOwnerAccount } = await import("../admin/createOwner.js");
    await expect(
      createOwnerAccount({ name: "Second", email: `second${D}`, password: PW }),
    ).rejects.toThrow(/owner が既に存在します/);
  });

  it("作成した owner のパスワードでログインできる", async () => {
    await setupOwner();
    await expect(login(`owner${D}`, PW)).resolves.toContain("token=");
  });
});
