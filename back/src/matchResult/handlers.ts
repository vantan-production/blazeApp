// 試合結果の取得・作成・更新・削除

import { getTableColumns } from "drizzle-orm";
import { count } from "drizzle-orm";
import type { Context } from "hono";
import { desc, eq, z } from "../index.js";
import { admin, buildPagination, db, matchResults, parsePage } from "../shared/index.js";
import {
  createMatchResultSchema,
  opponentAndSetsSchema,
  toFieldErrors,
  updateMatchResultSchema,
} from "./schemas.js";

// uuid 型の列に形式外の文字列を渡すと Postgres が例外を投げ 500 になるため、先に形だけ検証する
const idSchema = z.guid();

const NOT_FOUND = "試合結果が見つかりません。";

// 試合日の新しい順。同じ日に複数試合あるときは後から登録したものを先にする
const ORDER = [desc(matchResults.played_on), desc(matchResults.created_at)];

const selectWithAdminName = () =>
  db
    .select({ ...getTableColumns(matchResults), admin_name: admin.name })
    .from(matchResults)
    .leftJoin(admin, eq(matchResults.admin_id, admin.id));

type Row = Awaited<ReturnType<ReturnType<typeof selectWithAdminName>["execute"]>>[number];

const toResponse = (row: Row) => ({ ...row, admin_name: row.admin_name ?? "元管理者" });

/** リクエストボディをJSONとして読む（不正なら null） */
async function readJson(c: Context): Promise<unknown | null> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

// GET /api/match-results — 一覧（誰でも閲覧可。試合日の新しい順・10件ずつ）
export async function getAll(c: Context) {
  const { page, limit, offset } = parsePage(c);

  const [rows, totalResult] = await Promise.all([
    selectWithAdminName().orderBy(...ORDER).limit(limit).offset(offset),
    db.select({ total: count() }).from(matchResults),
  ]);
  const total = Number(totalResult[0]?.total ?? 0);

  return c.json(
    {
      success: true,
      data: rows.map(toResponse),
      pagination: buildPagination(page, limit, total),
    },
    200,
  );
}

// GET /api/match-results/:id — 詳細（誰でも閲覧可）
export async function getById(c: Context) {
  const parsed = idSchema.safeParse(c.req.param("id"));
  if (!parsed.success) return c.json({ success: false, errors: NOT_FOUND }, 404);

  const rows = await selectWithAdminName().where(eq(matchResults.id, parsed.data));
  const row = rows[0];
  if (!row) return c.json({ success: false, errors: NOT_FOUND }, 404);

  return c.json({ success: true, data: toResponse(row) }, 200);
}

// POST /api/match-results — 作成（admin 以上）
export async function create(c: Context) {
  const user = c.get("user") as { id: string };

  const body = await readJson(c);
  if (body === null) {
    return c.json({ success: false, errors: "リクエストのJSON形式が不正です" }, 400);
  }
  const result = createMatchResultSchema.safeParse(body);
  if (!result.success) {
    return c.json({ success: false, errors: toFieldErrors(result.error) }, 400);
  }

  const { tournament_result, opponent_name, sets, ...rest } = result.data;
  const inserted = await db
    .insert(matchResults)
    .values({
      ...rest,
      tournament_result: tournament_result ?? null,
      opponent_name: opponent_name ?? null,
      sets: sets ?? [],
      admin_id: user.id,
    })
    .returning();

  return c.json(
    { success: true, message: "試合結果を登録しました。", data: inserted[0] },
    200,
  );
}

// PATCH /api/match-results/:id — 更新（admin 以上。送ったフィールドだけ変える）
export async function update(c: Context) {
  const parsed = idSchema.safeParse(c.req.param("id"));
  if (!parsed.success) return c.json({ success: false, errors: NOT_FOUND }, 404);
  const id = parsed.data;

  const body = await readJson(c);
  if (body === null) {
    return c.json({ success: false, errors: "リクエストのJSON形式が不正です" }, 400);
  }
  const result = updateMatchResultSchema.safeParse(body);
  if (!result.success) {
    return c.json({ success: false, errors: toFieldErrors(result.error) }, 400);
  }

  // undefined（送られていない項目）は変更しない。大会成績の null・空文字は「成績なし」に戻す
  const { opponent_name: _opponent, sets: _sets, ...simpleFields } = result.data;
  const changes: Partial<typeof matchResults.$inferInsert> = {};
  for (const [key, value] of Object.entries(simpleFields)) {
    if (value !== undefined) Object.assign(changes, { [key]: value });
  }
  const sent = typeof body === "object" ? (body as Record<string, unknown>) : {};
  if ("tournament_result" in sent && result.data.tournament_result === undefined) {
    changes.tournament_result = null;
  }

  // 対戦相手と得点は組み合わせで意味を持つため、片方だけの変更は受け付けない
  const sendsOpponent = "opponent_name" in sent;
  const sendsSets = "sets" in sent;
  if (sendsOpponent !== sendsSets) {
    return c.json(
      {
        success: false,
        errors: [
          {
            field: sendsOpponent ? "sets" : "opponent_name",
            message: "対戦相手と得点（sets）は一緒に送ってください。",
          },
        ],
      },
      400,
    );
  }
  if (sendsSets) {
    const pair = opponentAndSetsSchema.safeParse({
      opponent_name: sent.opponent_name,
      sets: sent.sets,
    });
    if (!pair.success) {
      return c.json({ success: false, errors: toFieldErrors(pair.error) }, 400);
    }
    changes.opponent_name = pair.data.opponent_name ?? null;
    changes.sets = pair.data.sets;
  }
  if (Object.keys(changes).length === 0) {
    return c.json({ success: false, errors: "変更する項目がありません。" }, 400);
  }

  const updated = await db
    .update(matchResults)
    .set({ ...changes, updated_at: new Date() })
    .where(eq(matchResults.id, id))
    .returning();
  if (updated.length === 0) return c.json({ success: false, errors: NOT_FOUND }, 404);

  return c.json(
    { success: true, message: "試合結果を更新しました。", data: updated[0] },
    200,
  );
}

// DELETE /api/match-results/:id — 削除（admin 以上）
export async function remove(c: Context) {
  const parsed = idSchema.safeParse(c.req.param("id"));
  if (!parsed.success) return c.json({ success: false, errors: NOT_FOUND }, 404);

  const deleted = await db
    .delete(matchResults)
    .where(eq(matchResults.id, parsed.data))
    .returning({ id: matchResults.id });
  if (deleted.length === 0) return c.json({ success: false, errors: NOT_FOUND }, 404);

  return c.json({ success: true, message: "試合結果を削除しました。" }, 200);
}
