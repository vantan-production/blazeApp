// 掲載取り下げ依頼 API
//
// POST  /api/consent-requests      — 取り下げを依頼する（member 以上）
// GET   /api/consent-requests      — 依頼一覧（admin 以上）
// PATCH /api/consent-requests/:id  — 対応する（admin 以上）
//
// 「どの写真に誰が写っているか」の紐付けは持たず、member が任意の画像に対して
// 取り下げを申し出られる軽量な形にしている（設計書 §9 D）。

import { Hono } from "hono";
import { eq, desc, z } from "../index.js";
import { count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  db,
  images,
  admin,
  consentRequests,
  authToken,
  consentReasonSchema,
  getPresignedDownloadUrl,
  parsePage,
  buildPagination,
} from "../shared/index.js";
import { requireAdmin, requireMember } from "../db/roleGuard.js";
import type { Context } from "hono";

const app = new Hono();

// 依頼者と対応者で users テーブルを2回結合するため別名を付ける
const requester = alias(admin, "requester");
const handler = alias(admin, "handler");

// 対応時に指定できるのは accepted / rejected のみ（pending は初期値なので戻せない）
const handleSchema = z.object({
  status: z.enum(["accepted", "rejected"], {
    message: "status は accepted か rejected を指定してください。",
  }),
});

// POST /api/consent-requests
async function createConsentRequest(c: Context) {
  const user = c.get("user") as { id: string };

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, errors: "リクエストのJSON形式が不正です" }, 400);
  }

  const result = z
    .object({
      image_id: z.string().uuid("画像のIDが不正です。"),
      reason: consentReasonSchema,
    })
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

  const { image_id, reason } = result.data;

  const target = await db.select().from(images).where(eq(images.id, image_id));
  if (target.length === 0 || !target[0]?.game_id) {
    return c.json(
      { success: false, errors: "試合風景の画像が見つかりません。" },
      404,
    );
  }

  const inserted = await db
    .insert(consentRequests)
    .values({ image_id, requested_by: user.id, reason: reason ?? null })
    .returning();

  return c.json(
    {
      success: true,
      message: "取り下げ依頼を受け付けました。",
      data: inserted[0],
    },
    200,
  );
}

// GET /api/consent-requests
async function getConsentRequests(c: Context) {
  const { page, limit, offset } = parsePage(c);
  const status = c.req.query("status");

  const filter =
    status === "pending" || status === "accepted" || status === "rejected"
      ? eq(consentRequests.status, status)
      : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: consentRequests.id,
        image_id: consentRequests.image_id,
        reason: consentRequests.reason,
        status: consentRequests.status,
        handled_at: consentRequests.handled_at,
        created_at: consentRequests.created_at,
        requested_by: consentRequests.requested_by,
        requester_name: requester.name,
        requester_email: requester.email,
        handler_name: handler.name,
        image_path: images.path,
        image_consent_status: images.consent_status,
      })
      .from(consentRequests)
      .leftJoin(requester, eq(consentRequests.requested_by, requester.id))
      .leftJoin(handler, eq(consentRequests.handled_by, handler.id))
      .leftJoin(images, eq(consentRequests.image_id, images.id))
      .where(filter)
      .orderBy(desc(consentRequests.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(consentRequests).where(filter),
  ]);

  const data = await Promise.all(
    rows.map(async ({ image_path, ...row }) => ({
      ...row,
      requester_name: row.requester_name ?? "元利用者",
      // 対象がどの写真かを管理画面で確認できるようにURLを付ける
      image_url: image_path ? await getPresignedDownloadUrl(image_path) : null,
    })),
  );

  return c.json(
    {
      success: true,
      data,
      pagination: buildPagination(page, limit, Number(totalResult[0]?.total ?? 0)),
    },
    200,
  );
}

// PATCH /api/consent-requests/:id
async function handleConsentRequest(c: Context) {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const user = c.get("user") as { id: string };

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, errors: "リクエストのJSON形式が不正です" }, 400);
  }

  const result = handleSchema.safeParse(body);
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

  const existing = await db
    .select()
    .from(consentRequests)
    .where(eq(consentRequests.id, id));

  const request = existing[0];
  if (!request) {
    return c.json({ success: false, errors: "依頼が見つかりません。" }, 404);
  }

  if (request.status !== "pending") {
    return c.json({ success: false, errors: "この依頼は対応済みです。" }, 400);
  }

  const { status } = result.data;

  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(consentRequests)
      .set({ status, handled_by: user.id, handled_at: new Date() })
      .where(eq(consentRequests.id, id))
      .returning();

    // 依頼を受け入れた場合は、対象画像を掲載不可（rejected）にして公開ギャラリーから外す
    if (status === "accepted") {
      await tx
        .update(images)
        .set({ consent_status: "rejected" })
        .where(eq(images.id, request.image_id));
    }

    return rows[0];
  });

  return c.json(
    {
      success: true,
      message:
        status === "accepted"
          ? "依頼を受け入れ、対象の写真を非掲載にしました。"
          : "依頼を却下しました。",
      data: updated,
    },
    200,
  );
}

app.post("/api/consent-requests", authToken, requireMember, (c) =>
  createConsentRequest(c),
);
app.get("/api/consent-requests", authToken, requireAdmin, (c) =>
  getConsentRequests(c),
);
app.patch("/api/consent-requests/:id", authToken, requireAdmin, (c) =>
  handleConsentRequest(c),
);

export default app;
