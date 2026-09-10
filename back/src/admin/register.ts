// アカウント登録 API
// POST /api/admin/register — owner が発行した招待トークン経由でのみ登録できる
// 最初の owner は招待できないため scripts/createOwner.ts で作成する

import { randomBytes } from "node:crypto";
import { and, isNull } from "drizzle-orm";
import { hashToken } from "../db/token.js";
import {
  Hono,
  z,
  getConnInfo,
  rateLimiter,
  RedisStore,
  zxcvbn,
  bcrypt,
  eq,
} from "../index.js";
import {
  db,
  admin,
  invitations,
  emailSchema,
  passwordBaseSchema,
  adminNameSchema,
  invitationTokenSchema,
  redisClient,
} from "../shared/index.js";

const app = new Hono();

// 1分間に1回までの制御（テスト環境ではスキップ）
const registerLimiter =
  process.env.NODE_ENV === "test"
    ? (_c: unknown, next: () => Promise<void>) => next()
    : rateLimiter({
        windowMs: 60 * 1000,
        limit: 1,
        message: "1分間に1回しか送信できません",
        keyGenerator: (c) => {
          try { return getConnInfo(c).remote.address ?? "unknown"; } catch { return "unknown"; }
        },
        store: new RedisStore({
          sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        }) as any,
      });
// パスワードのハッシュ化
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};
// パスワードの検証
export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

app.post("/api/admin/register", registerLimiter, async (c) => {
  const userRegisterSchema = z
    .object({
      // 招待トークン（生値）。owner が発行した招待経由でのみ登録できる
      token: invitationTokenSchema,
      name: adminNameSchema,
      email: emailSchema,
      password: passwordBaseSchema,
      passwordConfirmation: z.string(),
    })
    .superRefine((data, ctx) => {
      // パスワードの強度チェック（name / email / emailのユーザー名部分も考慮）
      const strengthResult = zxcvbn(data.password, [
        data.name,
        data.email,
        data.email.split("@")[0] ?? "",
      ]);
      if (strengthResult.score < 3) {
        ctx.addIssue({
          code: "custom",
          message: "パスワードが簡単です。",
          path: ["password"],
        });
      }

      // パスワード確認チェック
      if (data.password !== data.passwordConfirmation) {
        ctx.addIssue({
          code: "custom",
          path: ["passwordConfirmation"],
          message: "パスワードが一致しません。",
        });
      }
    });

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { success: false, errors: "リクエストのJSON形式が不正です" },
      400,
    );
  }

  const result = userRegisterSchema.safeParse(body);
  // DB接続検証
  if (!result.success) {
    // 失敗
    return c.json(
      {
        success: false,
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      400,
    );
  }
  const { token, name, email, password } = result.data;

  // 招待の検証（存在する・未使用・期限内・宛先が一致）
  // 招待の有無を推測されないよう、どの失敗も同じ文言で返す
  const INVALID_INVITATION = "招待リンクが無効です。owner に再発行を依頼してください。";

  const invitationRows = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token_hash, hashToken(token)));

  const invitation = invitationRows[0];
  if (!invitation || invitation.used_at) {
    return c.json({ success: false, errors: INVALID_INVITATION }, 400);
  }

  if (invitation.expires_at.getTime() < Date.now()) {
    return c.json(
      { success: false, errors: "招待リンクの有効期限が切れています。" },
      400,
    );
  }

  // 招待されたアドレス以外での登録は許可しない（リンクの転送による第三者登録を防ぐ）
  if (invitation.email !== email) {
    return c.json({ success: false, errors: INVALID_INVITATION }, 400);
  }

  // メールアドレスの重複チェック
  const existingUser = await db
    .select()
    .from(admin)
    .where(eq(admin.email, email));

  if (existingUser.length > 0) {
    return c.json(
      { success: false, errors: "このメールアドレスは既に登録されています。" },
      409,
    );
  }

  // パスワードのハッシュ化
  const hashedPassword = await hashPassword(password);

  // ロールは招待時に owner が指定したものを使う（自己申告は受け付けない）
  const role = invitation.role;

  // トークンを生成（生値はCookie、ハッシュをDBに保存）
  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);
  const token_issued_at = new Date();

  try {
    // 招待の使用済みマークとユーザー作成を原子化する。
    // used_at IS NULL を条件に更新し、更新できなければ他のリクエストが先に使ったと判断する
    // （同じリンクで同時に登録されるのを防ぐ）
    let alreadyUsed = false;

    await db.transaction(async (tx) => {
      const consumed = await tx
        .update(invitations)
        .set({ used_at: new Date() })
        .where(and(eq(invitations.id, invitation.id), isNull(invitations.used_at)))
        .returning({ id: invitations.id });

      if (consumed.length === 0) {
        alreadyUsed = true;
        return;
      }

      await tx.insert(admin).values({
        token: hashedToken,
        name,
        email,
        password: hashedPassword,
        token_issued_at,
        role,
      });
    });

    if (alreadyUsed) {
      return c.json({ success: false, errors: INVALID_INVITATION }, 400);
    }
    // 同時アクセスされてもしっかりエラーが出る
  } catch (e: any) {
    if (e.code === "23505") {
      return c.json(
        {
          success: false,
          errors: "このメールアドレスは既に登録されています。",
        },
        409,
      );
    }
    throw e;
  }

  c.header(
    "Set-Cookie",
    `token=${rawToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`,
  );
  // 成功（tokenはHttpOnly Cookieで送信済み。レスポンスボディには含めない）
  return c.json(
    {
      success: true,
      message: "アカウント作成成功",
      data: { name, email, role },
    },
    200,
  );
});

export default app;
