// 関係者限定 資料庫 API
//
// GET    /api/documents               — 一覧（member 以上）
// GET    /api/documents/:id/download  — ダウンロードURL発行（member 以上）
// POST   /api/documents               — 登録（admin 以上。PDF等を1件添付）
// PATCH  /api/documents/:id           — 更新（admin 以上。ファイル差し替えも可）
// DELETE /api/documents/:id           — 削除（admin 以上）
//
// 規約・年間スケジュール・練習メニュー等の配布に使う。
// ファイルの実体は既存の files テーブル（document_id で紐づく）と S3 に置く。

import { Hono } from "hono";
import { eq, desc, z } from "../index.js";
import { count } from "drizzle-orm";
import {
  db,
  files,
  admin,
  documents,
  authToken,
  documentTitleSchema,
  documentDescriptionSchema,
  categorySchema,
  processFileUpload,
  replaceMediaOnS3,
  deleteMediaFromS3,
  getPresignedDownloadUrl,
  parsePage,
  buildPagination,
} from "../shared/index.js";
import { requireAdmin, requireMember } from "../db/roleGuard.js";
import type { Context } from "hono";

const app = new Hono();

// ダウンロードURLの有効期限（発行から5分）
const DOWNLOAD_URL_TTL_SECONDS = 300;

const fieldErrors = (error: z.ZodError) =>
  error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));

/** 資料に紐づくファイル1件を返す（無ければ null） */
async function findFile(documentId: string) {
  const rows = await db.select().from(files).where(eq(files.document_id, documentId));
  return rows[0] ?? null;
}

// GET /api/documents
async function getAllDocuments(c: Context) {
  const { page, limit, offset } = parsePage(c);

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: documents.id,
        title: documents.title,
        description: documents.description,
        category: documents.category,
        admin_id: documents.admin_id,
        admin_name: admin.name,
        created_at: documents.created_at,
        updated_at: documents.updated_at,
        file_path: files.path,
      })
      .from(documents)
      .leftJoin(admin, eq(documents.admin_id, admin.id))
      .leftJoin(files, eq(files.document_id, documents.id))
      .orderBy(desc(documents.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(documents),
  ]);

  const data = rows.map(({ file_path, ...row }) => ({
    ...row,
    admin_name: row.admin_name ?? "元管理者",
    // 一覧ではファイル名だけ返し、実URLは download で都度発行する
    file_name: file_path ? (file_path.split("/").pop() ?? null) : null,
    has_file: file_path !== null,
  }));

  return c.json(
    {
      success: true,
      data,
      pagination: buildPagination(page, limit, Number(totalResult[0]?.total ?? 0)),
    },
    200,
  );
}

// GET /api/documents/:id/download
async function downloadDocument(c: Context) {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const rows = await db.select().from(documents).where(eq(documents.id, id));
  if (rows.length === 0) {
    return c.json({ success: false, errors: "資料が見つかりません。" }, 404);
  }

  const file = await findFile(id);
  if (!file) {
    return c.json({ success: false, errors: "この資料にはファイルがありません。" }, 404);
  }

  return c.json(
    {
      success: true,
      data: {
        id,
        url: await getPresignedDownloadUrl(file.path, DOWNLOAD_URL_TTL_SECONDS),
        file_name: file.path.split("/").pop() ?? null,
        expires_in: DOWNLOAD_URL_TTL_SECONDS,
      },
    },
    200,
  );
}

// POST /api/documents
async function createDocument(c: Context) {
  const user = c.get("user") as { id: string };
  const body = await c.req.parseBody();

  const result = z
    .object({
      title: documentTitleSchema,
      description: documentDescriptionSchema,
      category: categorySchema.optional(),
    })
    .safeParse({
      title: body["title"],
      description: body["description"] || undefined,
      category: body["category"] || undefined,
    });

  if (!result.success) {
    return c.json({ success: false, errors: fieldErrors(result.error) }, 400);
  }

  const uploaded = body["file"];
  if (!(uploaded instanceof File)) {
    return c.json({ success: false, errors: "ファイルは必須です。" }, 400);
  }

  const inserted = await db
    .insert(documents)
    .values({
      title: result.data.title,
      description: result.data.description ?? null,
      category: result.data.category ?? null,
      admin_id: user.id,
    })
    .returning();

  const document = inserted[0];
  if (!document) {
    return c.json({ success: false, errors: "資料の作成に失敗しました。" }, 500);
  }

  const fileResult = await processFileUpload(uploaded, `documents/${document.id}`);
  if (!fileResult.success) {
    // ファイルを保存できないと配布物として意味を成さないため、資料ごと取り消す
    await db.delete(documents).where(eq(documents.id, document.id));
    return c.json({ success: false, errors: fileResult.error }, fileResult.status);
  }

  await db.insert(files).values({ path: fileResult.path, document_id: document.id });

  return c.json(
    { success: true, message: "資料を登録しました。", data: document },
    200,
  );
}

// PATCH /api/documents/:id
async function updateDocument(c: Context) {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const existing = await db.select().from(documents).where(eq(documents.id, id));
  if (existing.length === 0) {
    return c.json({ success: false, errors: "資料が見つかりません。" }, 404);
  }

  const body = await c.req.parseBody();

  // category は「未送信=変更なし」と「空文字送信=削除」を区別する（news/update.ts と同じ扱い）
  const rawCategory = body["category"];
  const categoryProvided = typeof rawCategory === "string";
  const categoryCleared = categoryProvided && rawCategory.trim() === "";

  const result = z
    .object({
      title: documentTitleSchema.optional(),
      description: documentDescriptionSchema,
      category: categorySchema.optional(),
    })
    .safeParse({
      title: body["title"] || undefined,
      description: body["description"] || undefined,
      category: categoryProvided && !categoryCleared ? rawCategory : undefined,
    });

  if (!result.success) {
    return c.json({ success: false, errors: fieldErrors(result.error) }, 400);
  }

  const updateData: Record<string, unknown> = { updated_at: new Date() };
  if (result.data.title) updateData.title = result.data.title;
  if (result.data.description !== undefined) {
    updateData.description = result.data.description;
  }
  if (result.data.category) updateData.category = result.data.category;
  else if (categoryCleared) updateData.category = null;

  // ファイルが送られていれば差し替える
  const uploaded = body["file"];
  if (uploaded instanceof File) {
    const current = await findFile(id);
    const fileResult = await replaceMediaOnS3(
      current?.path ?? null,
      uploaded,
      `documents/${id}`,
      "file",
    );
    if (!fileResult.success) {
      return c.json({ success: false, errors: fileResult.error }, fileResult.status);
    }

    if (current) {
      await db.update(files).set({ path: fileResult.path }).where(eq(files.id, current.id));
    } else {
      await db.insert(files).values({ path: fileResult.path, document_id: id });
    }
  }

  const updated = await db
    .update(documents)
    .set(updateData)
    .where(eq(documents.id, id))
    .returning();

  return c.json(
    { success: true, message: "資料を更新しました。", data: updated[0] },
    200,
  );
}

// DELETE /api/documents/:id
async function removeDocument(c: Context) {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const existing = await db.select().from(documents).where(eq(documents.id, id));
  if (existing.length === 0) {
    return c.json({ success: false, errors: "資料が見つかりません。" }, 404);
  }

  const related = await db.select().from(files).where(eq(files.document_id, id));
  await deleteMediaFromS3(related);

  // files は document_id の cascade で一緒に消える
  await db.delete(documents).where(eq(documents.id, id));

  return c.json({ success: true, message: "資料を削除しました。" }, 200);
}

// :id 単体より先に、サブパスを持つルートを登録する
app.get("/api/documents/:id/download", authToken, requireMember, (c) =>
  downloadDocument(c),
);

app.get("/api/documents", authToken, requireMember, (c) => getAllDocuments(c));
app.post("/api/documents", authToken, requireAdmin, (c) => createDocument(c));
app.patch("/api/documents/:id", authToken, requireAdmin, (c) => updateDocument(c));
app.delete("/api/documents/:id", authToken, requireAdmin, (c) => removeDocument(c));

export default app;
