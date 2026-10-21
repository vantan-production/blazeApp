// ロールベースアクセス制御ミドルウェア
// authToken の後に使用する（c.get("user") が設定済みであること前提）

import type { Context, Next } from "hono";
import type { admin } from "./schema.js";

type User = typeof admin.$inferSelect;
export type Role = "owner" | "admin" | "member";

// 関係者エリアのコンテンツを見てよい閲覧者か（未ログインは false）。
// 認証必須ではない一覧APIで、visibility='member' の記事を出し分けるのに使う。
export const isMemberOrAbove = (user: User | null): boolean =>
  user !== null && ["owner", "admin", "member"].includes(user.role);

function requireRole(...allowedRoles: Role[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as User | undefined;
    if (!user || !allowedRoles.includes(user.role as Role)) {
      return c.json(
        { success: false, errors: "この操作を行う権限がありません。" },
        403,
      );
    }
    await next();
  };
}

// owner のみ
export const requireOwner = requireRole("owner");

// admin または owner
export const requireAdmin = requireRole("owner", "admin");

// 関係者エリア。member 以上（owner ⊃ admin ⊃ member）
export const requireMember = requireRole("owner", "admin", "member");
