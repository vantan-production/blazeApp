// アンケートの閲覧（member 以上）

import { eq, desc, and } from "../index.js";
import { count } from "drizzle-orm";
import {
  db,
  surveys,
  surveyOptions,
  surveyResponses,
  admin,
  parsePage,
  buildPagination,
} from "../shared/index.js";
import type { Context } from "hono";

/** 締切を過ぎているか（締切なしは常に受付中） */
export const isClosed = (closesAt: Date | null): boolean =>
  closesAt !== null && closesAt.getTime() < Date.now();

// GET /api/surveys — 一覧（自分の回答状況付き）
export async function getAllSurveys(c: Context) {
  const user = c.get("user") as { id: string };
  const { page, limit, offset } = parsePage(c);

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: surveys.id,
        title: surveys.title,
        body: surveys.body,
        closes_at: surveys.closes_at,
        allow_multiple: surveys.allow_multiple,
        admin_id: surveys.admin_id,
        admin_name: admin.name,
        created_at: surveys.created_at,
        updated_at: surveys.updated_at,
      })
      .from(surveys)
      .leftJoin(admin, eq(surveys.admin_id, admin.id))
      .orderBy(desc(surveys.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(surveys),
  ]);

  // 自分が回答済みのアンケートID（一覧の件数分だけ問い合わせる）
  const myResponses = await db
    .select({ survey_id: surveyResponses.survey_id })
    .from(surveyResponses)
    .where(eq(surveyResponses.user_id, user.id));
  const answered = new Set(myResponses.map((r) => r.survey_id));

  const data = rows.map((row) => ({
    ...row,
    admin_name: row.admin_name ?? "元管理者",
    is_closed: isClosed(row.closes_at),
    has_responded: answered.has(row.id),
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

// GET /api/surveys/:id — 詳細（選択肢と自分の回答）
export async function getSurveyById(c: Context) {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const user = c.get("user") as { id: string };

  const rows = await db
    .select({
      id: surveys.id,
      title: surveys.title,
      body: surveys.body,
      closes_at: surveys.closes_at,
      allow_multiple: surveys.allow_multiple,
      admin_id: surveys.admin_id,
      admin_name: admin.name,
      created_at: surveys.created_at,
      updated_at: surveys.updated_at,
    })
    .from(surveys)
    .leftJoin(admin, eq(surveys.admin_id, admin.id))
    .where(eq(surveys.id, id));

  const survey = rows[0];
  if (!survey) {
    return c.json({ success: false, errors: "アンケートが見つかりません。" }, 404);
  }

  const [options, myResponses] = await Promise.all([
    db
      .select()
      .from(surveyOptions)
      .where(eq(surveyOptions.survey_id, id))
      .orderBy(surveyOptions.sort_order),
    db
      .select()
      .from(surveyResponses)
      .where(
        and(eq(surveyResponses.survey_id, id), eq(surveyResponses.user_id, user.id)),
      ),
  ]);

  return c.json(
    {
      success: true,
      data: {
        ...survey,
        admin_name: survey.admin_name ?? "元管理者",
        is_closed: isClosed(survey.closes_at),
        options,
        // 自分の回答のみ返す。他人の回答は admin 向けの results で確認する
        my_response: {
          option_ids: myResponses.map((r) => r.option_id),
          comment: myResponses[0]?.comment ?? null,
        },
      },
    },
    200,
  );
}
