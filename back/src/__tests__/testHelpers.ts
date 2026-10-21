// テスト共通ヘルパー関数

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { app } from "../app.js";
import { testDb } from "./setup.js";
import { admin, invitations } from "../db/schema.js";
import { hashToken } from "../db/token.js";
import { createOwnerAccount, ownerExists } from "../admin/createOwner.js";

const DEFAULT_PASSWORD = "Test@Password1!";

/**
 * Set-Cookie レスポンスヘッダから Cookie リクエストヘッダ用の "token=xxx" 文字列を抽出する。
 * ブラウザは Set-Cookie 属性（HttpOnly, Secure 等）を Cookie ヘッダに含めないため、
 * テストでも同様に純粋な "token=value" だけを送信する。
 */
export function extractCookie(setCookieHeader: string): string {
  const match = setCookieHeader.match(/token=[^;]*/);
  if (!match) {
    throw new Error(`set-cookie ヘッダに token が含まれていません: ${setCookieHeader}`);
  }
  return match[0];
}

/** メール・パスワードでログインして Cookie 文字列を返す */
export async function login(email: string, pw = DEFAULT_PASSWORD): Promise<string> {
  const loginRes = await app.request("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pw }),
  });
  if (loginRes.status !== 200) {
    const body = await loginRes.text();
    throw new Error(`login failed: ${loginRes.status} ${body}`);
  }
  return extractCookie(loginRes.headers.get("set-cookie") ?? "");
}

/**
 * 招待を直接DBに用意して生トークンを返す（前提条件の準備用）。
 * 招待APIそのものを検証したい場合は API 経由で発行すること（invitation.test.ts 参照）。
 */
export async function seedInvitation(
  email: string,
  role: "admin" | "member" = "member",
): Promise<string> {
  const owners = await testDb.select().from(admin).where(eq(admin.role, "owner"));
  const owner = owners[0];
  if (!owner) {
    throw new Error("招待の発行には owner が必要です。先に owner を作成してください。");
  }

  const rawToken = randomBytes(32).toString("hex");
  await testDb.insert(invitations).values({
    email,
    token_hash: hashToken(rawToken),
    role,
    invited_by: owner.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return rawToken;
}

/**
 * ユーザーを用意してログインし、Cookie 文字列を返す。
 *
 * 登録は招待制のため、owner がまだ居なければ seed（createOwnerAccount）で owner として作り、
 * 既に居れば招待を用意してから登録する。呼び出し側は招待の存在を意識しなくてよい。
 */
export async function registerAndLogin(
  name: string,
  email: string,
  pw = DEFAULT_PASSWORD,
  role: "admin" | "member" = "member",
): Promise<string> {
  // 最初の1人は招待できないので owner として直接作成する（scripts/createOwner.ts と同じ経路）
  if (!(await ownerExists())) {
    await createOwnerAccount({ name, email, password: pw });
    return login(email, pw);
  }

  const token = await seedInvitation(email, role);

  const regRes = await app.request("/api/admin/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, name, email, password: pw, passwordConfirmation: pw }),
  });
  if (regRes.status !== 200) {
    const body = await regRes.text();
    throw new Error(`register failed: ${regRes.status} ${body}`);
  }

  return login(email, pw);
}

/** GET /api/admin/users を呼び出してユーザー一覧を返す */
export async function getUsers(cookie: string) {
  const res = await app.request("/api/admin/users", { headers: { Cookie: cookie } });
  if (res.status !== 200) {
    const body = await res.text();
    throw new Error(`getUsers failed: ${res.status} ${body}`);
  }
  const body = await res.json() as { data: Array<{ id: string; email: string; role: string }> };
  return body.data;
}
