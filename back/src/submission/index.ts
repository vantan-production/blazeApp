// member からの投稿申請 API
//
// POST  /api/submissions              — 投稿申請（member 以上）
// GET   /api/submissions              — 自分の申請一覧（member 以上）
// GET   /api/submissions/pending      — 承認待ち一覧（admin 以上）
// PATCH /api/submissions/:id/approve  — 承認して公開（admin 以上）
// PATCH /api/submissions/:id/reject   — 差し戻し（admin 以上）
//
// 申請の実体は news テーブル（type='news'）の行で、status で状態を持つ。
// member が作ると 'pending' になり、admin が承認して 'published' になる。
// 公開APIは 'published' のみを返すため、承認前の記事が外に出ることはない。

import { Hono } from "hono";
import { eq, desc, and, z } from "../index.js";
import { count, getTableColumns, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import {
  db,
  news,
  admin,
  authToken,
  titleSchema,
  bodySchema,
  categorySchema,
  processImageUpload,
  toMediaUrl,
  parsePage,
  buildPagination,
} from "../shared/index.js";
import { requireAdmin, requireMember } from "../db/roleGuard.js";
import type { Context } from "hono";

const app = new Hono();

/** 申請として扱う状態（公開済みも履歴として自分の一覧には出す） */
const SUBMISSION_STATUSES = ["draft", "pending", "published"] as const;

// POST /api/submissions
async function createSubmission(c: Context) {
  const user = c.get("user") as { id: string };
  const body = await c.req.parseBody();

  const result = z
    .object({
      title: titleSchema,
      body: bodySchema,
      category: categorySchema.optional(),
    })
    .safeParse({
      title: body["title"],
      body: body["body"],
      category: body["category"] || undefined,
    });

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

  let imgPath: string | null = null;
  const imageFile = body["image"];
  if (imageFile instanceof File) {
    const imageResult = await processImageUpload(
      imageFile,
      `submissions/${crypto.randomUUID()}`,
    );
    if (!imageResult.success) {
      return c.json({ success: false, errors: imageResult.error }, imageResult.status);
    }
    imgPath = imageResult.path;
  }

  const inserted = await db
    .insert(news)
    .values({
      title: result.data.title,
      body: result.data.body,
      category: result.data.category ?? null,
      img: imgPath,
      type: "news",
      admin_id: user.id,
      // 承認されるまで公開しない
      status: "pending",
      visibility: "public",
    })
    .returning();

  return c.json(
    {
      success: true,
      message: "投稿を申請しました。管理者の承認をお待ちください。",
      data: inserted[0],
    },
    200,
  );
}

/** 一覧を組み立てる共通処理 */
async function listSubmissions(c: Context, filter: SQL | undefined) {
  const { page, limit, offset } = parsePage(c);

  const [rows, totalResult] = await Promise.all([
    db
      .select({ ...getTableColumns(news), admin_name: admin.name })
      .from(news)
      .leftJoin(admin, eq(news.admin_id, admin.id))
      .where(filter)
      .orderBy(desc(news.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(news).where(filter),
  ]);

  const data = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      admin_name: row.admin_name ?? "元管理者",
      img_url: await toMediaUrl(row.img),
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

// GET /api/submissions — 自分の申請一覧
async function getMySubmissions(c: Context) {
  const user = c.get("user") as { id: string };
  return listSubmissions(
    c,
    and(eq(news.admin_id, user.id), inArray(news.status, [...SUBMISSION_STATUSES])),
  );
}

// GET /api/submissions/pending — 承認待ち一覧
async function getPendingSubmissions(c: Context) {
  return listSubmissions(c, eq(news.status, "pending"));
}

/** 承認・差し戻しの共通処理 */
function decide(nextStatus: "published" | "draft", message: string) {
  return async (c: Context) => {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

    const existing = await db.select().from(news).where(eq(news.id, id));
    const submission = existing[0];

    if (!submission) {
      return c.json({ success: false, errors: "申請が見つかりません。" }, 404);
    }

    if (submission.status !== "pending") {
      return c.json({ success: false, errors: "この申請は対応済みです。" }, 400);
    }

    const updated = await db
      .update(news)
      .set({ status: nextStatus, updated_at: new Date() })
      .where(eq(news.id, id))
      .returning();

    return c.json({ success: true, message, data: updated[0] }, 200);
  };
}

// :id より先に固定パスを登録する
app.get("/api/submissions/pending", authToken, requireAdmin, (c) =>
  getPendingSubmissions(c),
);

app.get("/api/submissions", authToken, requireMember, (c) => getMySubmissions(c));
app.post("/api/submissions", authToken, requireMember, (c) => createSubmission(c));

app.patch(
  "/api/submissions/:id/approve",
  authToken,
  requireAdmin,
  decide("published", "申請を承認し、公開しました。"),
);
app.patch(
  "/api/submissions/:id/reject",
  authToken,
  requireAdmin,
  decide("draft", "申請を差し戻しました。"),
);

export default app;
