// 招待 API（owner専用。verify のみ認証不要）
// POST   /api/admin/invitations            — 招待発行＋招待メール送信
// GET    /api/admin/invitations            — 招待一覧
// POST   /api/admin/invitations/:id/resend — 招待メールの再送（新しいリンクで発行し直す）
// DELETE /api/admin/invitations/:id        — 招待の失効
// GET    /api/admin/invitations/verify — トークンの有効性確認（登録画面の表示判定用）

import { randomBytes } from "node:crypto";
import { and, isNull } from "drizzle-orm";
import { Hono, z, eq } from "../index.js";
import {
  db,
  admin,
  invitations,
  authToken,
  emailSchema,
  invitationRoleSchema,
  invitationTokenSchema,
  sendInvitationEmail,
} from "../shared/index.js";
import { requireOwner } from "../db/roleGuard.js";
import { hashToken } from "../db/token.js";
import { requireUuidParams } from "../utils/uuidParam.js";

type Variables = { user: typeof admin.$inferSelect };
type InvitationRole = z.infer<typeof invitationRoleSchema>;

const app = new Hono<{ Variables: Variables }>();

// 招待の有効期限（発行から7日）
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// 一覧表示用のステータス。DBには持たず、used_at と expires_at から導出する
type InvitationStatus = "pending" | "used" | "expired";

const invitationStatus = (
  used_at: Date | null,
  expires_at: Date,
): InvitationStatus => {
  if (used_at) return "used";
  return expires_at.getTime() < Date.now() ? "expired" : "pending";
};

// 招待を発行して招待メールを送る（新規発行・再送で共通）。
// 同じアドレス宛の未使用招待は、新規発行時に無効化する（削除と挿入を原子化）。
// 招待メールを送り直したときに古いリンクが生き残らないようにするため。
const issueInvitation = async (
  email: string,
  role: InvitationRole,
  invitedBy: string,
) => {
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  await db.transaction(async (tx) => {
    await tx
      .delete(invitations)
      .where(and(eq(invitations.email, email), isNull(invitations.used_at)));

    await tx.insert(invitations).values({
      email,
      token_hash: hashToken(rawToken),
      role,
      invited_by: invitedBy,
      expires_at: expiresAt,
    });
  });

  // 招待自体は発行済みなので送信失敗でもエラーにはせず、mail_sent で画面に伝える（owner は再送で対応できる）
  let mailSent = true;
  try {
    await sendInvitationEmail(email, rawToken, role);
  } catch (e) {
    console.error("[invitations] 招待メール送信失敗:", e);
    mailSent = false;
  }

  return { rawToken, expiresAt, mailSent };
};

// 発行・再送のレスポンス本体
const issuedResponse = (
  email: string,
  role: InvitationRole,
  issued: Awaited<ReturnType<typeof issueInvitation>>,
  message: string,
) => ({
  success: true,
  message: issued.mailSent
    ? message
    : "招待は発行しましたが、招待メールを送れませんでした。",
  data: {
    email,
    role,
    expires_at: issued.expiresAt,
    mail_sent: issued.mailSent,
    // テスト環境でのみ、実メール送信を介さずトークンを検証できるようレスポンスに含める
    ...(process.env.NODE_ENV === "test" && { token: issued.rawToken }),
  },
});

// 招待発行
app.post("/api/admin/invitations", authToken, requireOwner, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, errors: "リクエストのJSON形式が不正です" }, 400);
  }

  const result = z
    .object({ email: emailSchema, role: invitationRoleSchema })
    .safeParse(body);

  if (!result.success) {
    return c.json(
      {
        success: false,
        errors: result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      400,
    );
  }

  const { email, role } = result.data;

  // 既に登録済みのアドレスは招待できない（削除済みアカウントは復活の対象なので除外しない）
  const existingUsers = await db.select().from(admin).where(eq(admin.email, email));
  if (existingUsers.length > 0) {
    return c.json(
      { success: false, errors: "このメールアドレスは既に登録されています。" },
      409,
    );
  }

  const issued = await issueInvitation(email, role, c.get("user").id);
  return c.json(issuedResponse(email, role, issued, "招待を発行しました。"), 200);
});

// 招待一覧（新しい順）
app.get("/api/admin/invitations", authToken, requireOwner, async (c) => {
  const rows = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      invited_by: invitations.invited_by,
      expires_at: invitations.expires_at,
      used_at: invitations.used_at,
      created_at: invitations.created_at,
    })
    .from(invitations)
    .orderBy(invitations.created_at);

  // トークンハッシュは返さない。代わりに画面で使うステータスを付与する
  const data = rows
    .map((row) => ({
      ...row,
      status: invitationStatus(row.used_at, row.expires_at),
    }))
    .reverse();

  return c.json({ success: true, total: data.length, data }, 200);
});

// トークンの有効性確認（登録画面が「このリンクは有効か」を判定するために使う。認証不要）
// アドレスも返す（登録フォームのメール欄を埋めるため。トークンを知っている人にしか見えない）
app.get("/api/admin/invitations/verify", async (c) => {
  const result = invitationTokenSchema.safeParse(c.req.query("token") ?? "");
  if (!result.success) {
    return c.json({ success: false, errors: "無効な招待リンクです。" }, 400);
  }

  const rows = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token_hash, hashToken(result.data)));

  const invitation = rows[0];
  if (!invitation || invitation.used_at) {
    return c.json({ success: false, errors: "無効な招待リンクです。" }, 400);
  }

  if (invitation.expires_at.getTime() < Date.now()) {
    return c.json({ success: false, errors: "招待リンクの有効期限が切れています。" }, 400);
  }

  return c.json(
    {
      success: true,
      data: { email: invitation.email, role: invitation.role },
    },
    200,
  );
});

// 招待メールの再送（未使用・期限切れのもの）。
// 同じ宛先・ロールで発行し直すため、古いリンクは使えなくなり、有効期限も発行時点から7日に戻る
app.post(
  "/api/admin/invitations/:id/resend",
  authToken,
  requireOwner,
  requireUuidParams,
  async (c) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, errors: "招待IDが指定されていません。" }, 400);
    }

    const rows = await db.select().from(invitations).where(eq(invitations.id, id));
    const invitation = rows[0];

    if (!invitation) {
      return c.json({ success: false, errors: "招待が見つかりません。" }, 404);
    }

    if (invitation.used_at) {
      return c.json(
        { success: false, errors: "使用済みの招待は再送できません。" },
        400,
      );
    }

    // 招待以外の経路で登録済みになったアドレスには送らない（新規発行と同じ判定）
    const existingUsers = await db
      .select()
      .from(admin)
      .where(eq(admin.email, invitation.email));
    if (existingUsers.length > 0) {
      return c.json(
        { success: false, errors: "このメールアドレスは既に登録されています。" },
        409,
      );
    }

    // DB の role は text なので、発行時と同じスキーマで絞り込んでから使う
    const role = invitationRoleSchema.parse(invitation.role);
    const issued = await issueInvitation(invitation.email, role, c.get("user").id);
    return c.json(
      issuedResponse(invitation.email, role, issued, "招待メールを再送しました。"),
      200,
    );
  },
);

// 招待の失効（未使用のものだけ。使用済みは登録の履歴として残す）
app.delete("/api/admin/invitations/:id", authToken, requireOwner, requireUuidParams, async (c) => {
  const id = c.req.param("id");
  if (!id) {
    return c.json({ success: false, errors: "招待IDが指定されていません。" }, 400);
  }

  const rows = await db.select().from(invitations).where(eq(invitations.id, id));
  const invitation = rows[0];

  if (!invitation) {
    return c.json({ success: false, errors: "招待が見つかりません。" }, 404);
  }

  if (invitation.used_at) {
    return c.json(
      { success: false, errors: "使用済みの招待は失効できません。" },
      400,
    );
  }

  await db.delete(invitations).where(eq(invitations.id, id));

  return c.json({ success: true, message: "招待を失効しました。" }, 200);
});

export default app;
