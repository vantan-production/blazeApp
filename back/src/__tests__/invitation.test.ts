// 招待（Phase 0）統合テスト
// 自己登録が塞がれていること、招待の発行・確認・失効が owner に限られることを検証する。

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { app } from "../app.js";
import { cleanDb, testDb } from "./setup.js";
import { registerAndLogin, seedInvitation, login } from "./testHelpers.js";
import { invitations } from "../db/schema.js";
import { hashToken } from "../db/token.js";
import { mailTransport } from "../utils/mail.js";
import { eq } from "drizzle-orm";

const D = "@invitation.test";
const PW = "Test@Password1!";

beforeEach(async () => {
  await cleanDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** 招待メールの送信を失敗させる（送信失敗のログはテスト出力に出さない） */
const failMailSending = () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  return vi
    .spyOn(mailTransport, "send")
    .mockResolvedValue({ error: { message: "rate limited" } });
};

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
  const body = (await res.json()) as IssuedBody;
  return { status: res.status, body };
}

type IssuedBody = {
  success: boolean;
  message?: string;
  data?: {
    email?: string;
    token?: string;
    role?: string;
    expires_at?: string;
    mail_sent?: boolean;
  };
};

/** 招待一覧を取得する */
async function listInvitations(ownerCookie: string) {
  const res = await app.request("/api/admin/invitations", {
    headers: { Cookie: ownerCookie },
  });
  const body = (await res.json()) as {
    data: Array<{ id: string; email: string; role: string; status: string; expires_at: string }>;
  };
  return body.data;
}

/** 招待メールを再送する */
async function resendInvitation(cookie: string, id: string) {
  const res = await app.request(`/api/admin/invitations/${id}/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
  });
  const body = (await res.json()) as IssuedBody;
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
    expect(body.data?.mail_sent).toBe(true);
  });

  it("招待メールを送れなくても招待は発行し、mail_sent: false で伝える", async () => {
    const cookie = await setupOwner();
    const sendSpy = failMailSending();

    const { status, body } = await issueInvitation(cookie, `mailfail${D}`);

    expect(status).toBe(200);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(body.data?.mail_sent).toBe(false);
    expect(body.message).toBe("招待は発行しましたが、招待メールを送れませんでした。");

    // 発行した招待のリンクは有効なまま
    const verifyRes = await app.request(
      `/api/admin/invitations/verify?token=${body.data?.token}`,
    );
    expect(verifyRes.status).toBe(200);
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

// --- 再送 ---

describe("POST /api/admin/invitations/:id/resend", () => {
  it("未使用の招待を同じ宛先・ロールで送り直し、古いリンクは使えなくなる", async () => {
    const cookie = await setupOwner();
    const first = await issueInvitation(cookie, `resend${D}`, "admin");
    const [invitation] = await listInvitations(cookie);
    const sendSpy = vi.spyOn(mailTransport, "send");

    const { status, body } = await resendInvitation(cookie, invitation?.id ?? "");

    expect(status).toBe(200);
    expect(body.data?.email).toBe(`resend${D}`);
    expect(body.data?.role).toBe("admin");
    expect(body.data?.mail_sent).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0]?.[0].to).toBe(`resend${D}`);

    const oldRes = await app.request(
      `/api/admin/invitations/verify?token=${first.body.data?.token}`,
    );
    expect(oldRes.status).toBe(400);
    const newRes = await app.request(
      `/api/admin/invitations/verify?token=${body.data?.token}`,
    );
    expect(newRes.status).toBe(200);

    // 一覧には新しい招待だけが残る
    const list = await listInvitations(cookie);
    expect(list).toHaveLength(1);
    expect(list[0]?.status).toBe("pending");
  });

  it("期限切れの招待も送り直せ、有効期限が7日後に戻る", async () => {
    const cookie = await setupOwner();
    const token = await seedInvitation(`expired${D}`);
    await testDb
      .update(invitations)
      .set({ expires_at: new Date(Date.now() - 1000) })
      .where(eq(invitations.token_hash, hashToken(token)));
    const [expired] = await listInvitations(cookie);
    expect(expired?.status).toBe("expired");

    const { status, body } = await resendInvitation(cookie, expired?.id ?? "");

    expect(status).toBe(200);
    const expiresIn = new Date(body.data?.expires_at ?? 0).getTime() - Date.now();
    expect(expiresIn).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);

    const list = await listInvitations(cookie);
    expect(list.map((i) => i.status)).toEqual(["pending"]);
  });

  it("招待メールを送れなくても再発行はされ、mail_sent: false で伝える", async () => {
    const cookie = await setupOwner();
    const first = await issueInvitation(cookie, `resendfail${D}`);
    const [invitation] = await listInvitations(cookie);
    failMailSending();

    const { status, body } = await resendInvitation(cookie, invitation?.id ?? "");

    expect(status).toBe(200);
    expect(body.data?.mail_sent).toBe(false);
    expect(body.message).toBe("招待は発行しましたが、招待メールを送れませんでした。");

    // 古いリンクは失効し、新しいリンクが有効
    const oldRes = await app.request(
      `/api/admin/invitations/verify?token=${first.body.data?.token}`,
    );
    expect(oldRes.status).toBe(400);
    const newRes = await app.request(
      `/api/admin/invitations/verify?token=${body.data?.token}`,
    );
    expect(newRes.status).toBe(200);
  });

  it("使用済みの招待は再送できない", async () => {
    const cookie = await setupOwner();
    await registerAndLogin("Member", `member${D}`);
    const used = (await listInvitations(cookie)).find((i) => i.status === "used");
    expect(used).toBeTruthy();
    const sendSpy = vi.spyOn(mailTransport, "send");

    const { status } = await resendInvitation(cookie, used?.id ?? "");

    expect(status).toBe(400);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("宛先が既に登録済みなら 409", async () => {
    const cookie = await setupOwner();
    // 招待とは別に同じアドレスのアカウントがある状態を作る
    await seedInvitation(`owner${D}`);
    const [invitation] = await listInvitations(cookie);

    const { status } = await resendInvitation(cookie, invitation?.id ?? "");
    expect(status).toBe(409);
  });

  it("存在しないIDは 404", async () => {
    const cookie = await setupOwner();
    const { status } = await resendInvitation(
      cookie,
      "00000000-0000-0000-0000-000000000000",
    );
    expect(status).toBe(404);
  });

  it("member は 403", async () => {
    const ownerCookie = await setupOwner();
    await issueInvitation(ownerCookie, `x${D}`);
    const memberCookie = await registerAndLogin("Member", `member${D}`);
    const pending = (await listInvitations(ownerCookie)).find(
      (i) => i.status === "pending",
    );

    const { status } = await resendInvitation(memberCookie, pending?.id ?? "");
    expect(status).toBe(403);
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
