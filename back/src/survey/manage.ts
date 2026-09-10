// アンケートの作成・更新・削除（admin 以上）

import { eq } from "../index.js";
import { db, surveys, surveyOptions } from "../shared/index.js";
import { createSurveySchema, updateSurveySchema, toFieldErrors } from "./schemas.js";
import type { Context } from "hono";

/** リクエストボディをJSONとして読む（不正なら null） */
async function readJson(c: Context): Promise<unknown | null> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

// POST /api/surveys
export async function createSurvey(c: Context) {
  const user = c.get("user") as { id: string };

  const body = await readJson(c);
  if (body === null) {
    return c.json({ success: false, errors: "リクエストのJSON形式が不正です" }, 400);
  }

  const result = createSurveySchema.safeParse(body);
  if (!result.success) {
    return c.json({ success: false, errors: toFieldErrors(result.error) }, 400);
  }

  const { title, body: description, closes_at, allow_multiple, options } = result.data;

  const created = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(surveys)
      .values({
        title,
        body: description ?? null,
        closes_at: closes_at ? new Date(closes_at) : null,
        allow_multiple: allow_multiple ?? false,
        admin_id: user.id,
      })
      .returning();

    const survey = inserted[0];
    if (!survey) throw new Error("アンケートの作成に失敗しました。");

    // sort_order の指定が無ければ配列の並び順をそのまま使う
    await tx.insert(surveyOptions).values(
      options.map((o, i) => ({
        survey_id: survey.id,
        label: o.label,
        sort_order: o.sort_order ?? i,
      })),
    );

    return survey;
  });

  return c.json(
    { success: true, message: "アンケートを作成しました。", data: created },
    200,
  );
}

// PATCH /api/surveys/:id
export async function updateSurvey(c: Context) {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const existing = await db.select().from(surveys).where(eq(surveys.id, id));
  if (existing.length === 0) {
    return c.json({ success: false, errors: "アンケートが見つかりません。" }, 404);
  }

  const body = await readJson(c);
  if (body === null) {
    return c.json({ success: false, errors: "リクエストのJSON形式が不正です" }, 400);
  }

  const result = updateSurveySchema.safeParse(body);
  if (!result.success) {
    return c.json({ success: false, errors: toFieldErrors(result.error) }, 400);
  }

  const data = result.data;
  const updateData: Record<string, unknown> = { updated_at: new Date() };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.body !== undefined) updateData.body = data.body;
  if (data.closes_at !== undefined) {
    updateData.closes_at = data.closes_at ? new Date(data.closes_at) : null;
  }
  if (data.allow_multiple !== undefined) updateData.allow_multiple = data.allow_multiple;

  const updated = await db.transaction(async (tx) => {
    const rows = await tx
      .update(surveys)
      .set(updateData)
      .where(eq(surveys.id, id))
      .returning();

    // 選択肢を送ってきた場合は総入れ替えする。
    // survey_responses は option_id に cascade で紐づくため、既存の回答も破棄される。
    if (data.options) {
      await tx.delete(surveyOptions).where(eq(surveyOptions.survey_id, id));
      await tx.insert(surveyOptions).values(
        data.options.map((o, i) => ({
          survey_id: id,
          label: o.label,
          sort_order: o.sort_order ?? i,
        })),
      );
    }

    return rows[0];
  });

  return c.json(
    {
      success: true,
      message: data.options
        ? "アンケートを更新しました。選択肢を入れ替えたため、既存の回答は削除されました。"
        : "アンケートを更新しました。",
      data: updated,
    },
    200,
  );
}

// DELETE /api/surveys/:id
export async function removeSurvey(c: Context) {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const existing = await db.select().from(surveys).where(eq(surveys.id, id));
  if (existing.length === 0) {
    return c.json({ success: false, errors: "アンケートが見つかりません。" }, 404);
  }

  // 選択肢・回答は cascade で一緒に削除される
  await db.delete(surveys).where(eq(surveys.id, id));

  return c.json({ success: true, message: "アンケートを削除しました。" }, 200);
}
