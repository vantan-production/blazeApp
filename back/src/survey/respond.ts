// POST /api/surveys/:id/responses — 回答（member 以上）
//
// 回答は「送り直したら上書き」とする。自分の既存の回答を消してから入れ直すため、
// 選び直しがそのまま反映される。

import { eq, and } from "../index.js";
import { inArray } from "drizzle-orm";
import { db, surveys, surveyOptions, surveyResponses } from "../shared/index.js";
import { respondSchema, toFieldErrors } from "./schemas.js";
import { isClosed } from "./read.js";
import type { Context } from "hono";

export async function respondToSurvey(c: Context) {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const user = c.get("user") as { id: string };

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, errors: "リクエストのJSON形式が不正です" }, 400);
  }

  const result = respondSchema.safeParse(body);
  if (!result.success) {
    return c.json({ success: false, errors: toFieldErrors(result.error) }, 400);
  }

  const surveyRows = await db.select().from(surveys).where(eq(surveys.id, id));
  const survey = surveyRows[0];
  if (!survey) {
    return c.json({ success: false, errors: "アンケートが見つかりません。" }, 404);
  }

  if (isClosed(survey.closes_at)) {
    return c.json(
      { success: false, errors: "このアンケートは締め切られています。" },
      400,
    );
  }

  // 同じ選択肢を重複して送ってきた場合は1つにまとめる
  const optionIds = [...new Set(result.data.option_ids)];

  if (!survey.allow_multiple && optionIds.length > 1) {
    return c.json(
      { success: false, errors: "このアンケートは1つだけ選択できます。" },
      400,
    );
  }

  // 送られた選択肢がすべてこのアンケートのものか確認する
  const validOptions = await db
    .select({ id: surveyOptions.id })
    .from(surveyOptions)
    .where(
      and(eq(surveyOptions.survey_id, id), inArray(surveyOptions.id, optionIds)),
    );

  if (validOptions.length !== optionIds.length) {
    return c.json(
      { success: false, errors: "このアンケートに存在しない選択肢が含まれています。" },
      400,
    );
  }

  // 回答し直しに対応するため、自分の既存回答を消してから入れ直す
  await db.transaction(async (tx) => {
    await tx
      .delete(surveyResponses)
      .where(
        and(eq(surveyResponses.survey_id, id), eq(surveyResponses.user_id, user.id)),
      );

    await tx.insert(surveyResponses).values(
      optionIds.map((optionId) => ({
        survey_id: id,
        option_id: optionId,
        user_id: user.id,
        comment: result.data.comment ?? null,
      })),
    );
  });

  return c.json(
    {
      success: true,
      message: "回答を受け付けました。",
      data: { option_ids: optionIds, comment: result.data.comment ?? null },
    },
    200,
  );
}
