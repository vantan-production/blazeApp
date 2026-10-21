// 最初の owner アカウントを作成する（ルーターではない）
//
// 登録は招待制のため「最初の owner を誰が招待するのか」という問題が残る。
// これを API で解決すると誰でも叩ける抜け道になるため、CLI（scripts/createOwner.ts）から
// 直接DBに作成する。2人目以降の owner は owner によるロール変更で作る。

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { admin } from "../db/schema.js";
import { hashToken } from "../db/token.js";
import { hashPassword } from "./register.js";

export interface CreateOwnerInput {
  name: string;
  email: string;
  password: string;
}

export interface CreateOwnerResult {
  id: string;
  name: string;
  email: string;
}

/** owner が既に1人以上いるか */
export const ownerExists = async (): Promise<boolean> => {
  const owners = await db.select().from(admin).where(eq(admin.role, "owner"));
  return owners.length > 0;
};

/**
 * owner アカウントを作成する
 * 既に owner が存在する場合は作成しない（抜け道にしないため。追加の owner はロール変更で作る）
 * @throws 既存 owner がいる場合・メールアドレスが登録済みの場合
 */
export const createOwnerAccount = async ({
  name,
  email,
  password,
}: CreateOwnerInput): Promise<CreateOwnerResult> => {
  if (await ownerExists()) {
    throw new Error(
      "owner が既に存在します。追加の owner は PATCH /api/admin/users/:userId/role で作成してください。",
    );
  }

  const existing = await db.select().from(admin).where(eq(admin.email, email));
  if (existing.length > 0) {
    throw new Error(`このメールアドレスは既に登録されています: ${email}`);
  }

  // 認証トークンは通常の登録と同じ形式で発行しておく（発行直後のログインを待たずに済む）
  const rawToken = randomBytes(32).toString("hex");

  const inserted = await db
    .insert(admin)
    .values({
      name,
      email,
      password: await hashPassword(password),
      token: hashToken(rawToken),
      token_issued_at: new Date(),
      role: "owner",
    })
    .returning({ id: admin.id, name: admin.name, email: admin.email });

  const owner = inserted[0];
  if (!owner) throw new Error("owner の作成に失敗しました。");

  return owner;
};
