// アンケートの集計と未回答者一覧（admin 以上）
//
// 運用上いちばん効くのは「未回答者一覧」。誰に催促すればよいかが一目で分かる。

import { eq, and } from "../index.js";
import { isNull, inArray, notInArray } from "drizzle-orm";
import {
  db,
  surveys,
  surveyOptions,
  surveyResponses,
  admin,
} from "../shared/index.js";
import type { Context } from "hono";

/** アンケートの存在確認（無ければ 404 レスポンスを返す） */
async function findSurvey(c: Context, id: string | undefined) {
  if (!id) {
    return { error: c.json({ success: false, errors: "IDが指定されていません。" }, 400) };
  }
  const rows = await db.select().from(surveys).where(eq(surveys.id, id));
  if (rows.length === 0) {
    return {
      error: c.json({ success: false, errors: "アンケートが見つかりません。" }, 404),
    };
  }
  return { id };
}

// GET /api/surveys/:id/results — 集計結果
export async function getSurveyResults(c: Context) {
  const found = await findSurvey(c, c.req.param("id"));
  if (found.error) return found.error;
  const id = found.id;

  const [options, responses] = await Promise.all([
    db
      .select()
      .from(surveyOptions)
      .where(eq(surveyOptions.survey_id, id))
      .orderBy(surveyOptions.sort_order),
    db
      .select({
        option_id: surveyResponses.option_id,
        comment: surveyResponses.comment,
        user_id: surveyResponses.user_id,
        user_name: admin.name,
        user_email: admin.email,
      })
      .from(surveyResponses)
      .leftJoin(admin, eq(surveyResponses.user_id, admin.id))
      .where(eq(surveyResponses.survey_id, id)),
  ]);

  const byOption = options.map((option) => {
    const voters = responses.filter((r) => r.option_id === option.id);
    return {
      option_id: option.id,
      label: option.label,
      sort_order: option.sort_order,
      count: voters.length,
      voters: voters.map((v) => ({
        id: v.user_id,
        name: v.user_name ?? "元管理者",
        email: v.user_email,
      })),
    };
  });

  // 複数選択だと回答行が人数より多くなるため、実人数は user_id の種類数で数える
  const respondentCount = new Set(responses.map((r) => r.user_id)).size;

  // コメントは回答行ごとに同じ値が入るので、人単位で1件にまとめる
  const commentsByUser = new Map<string, { name: string; comment: string }>();
  for (const r of responses) {
    if (r.comment && !commentsByUser.has(r.user_id)) {
      commentsByUser.set(r.user_id, {
        name: r.user_name ?? "元管理者",
        comment: r.comment,
      });
    }
  }

  return c.json(
    {
      success: true,
      data: {
        respondent_count: respondentCount,
        options: byOption,
        comments: [...commentsByUser.entries()].map(([userId, v]) => ({
          user_id: userId,
          name: v.name,
          comment: v.comment,
        })),
      },
    },
    200,
  );
}

// GET /api/surveys/:id/pending — 未回答者一覧
export async function getPendingRespondents(c: Context) {
  const found = await findSurvey(c, c.req.param("id"));
  if (found.error) return found.error;
  const id = found.id;

  const responded = await db
    .select({ user_id: surveyResponses.user_id })
    .from(surveyResponses)
    .where(eq(surveyResponses.survey_id, id));

  const respondedIds = [...new Set(responded.map((r) => r.user_id))];

  // 対象は削除済みを除く全ユーザー（owner / admin / member）
  const pending = await db
    .select({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    })
    .from(admin)
    .where(
      respondedIds.length === 0
        ? isNull(admin.deleted_at)
        : and(isNull(admin.deleted_at), notInArray(admin.id, respondedIds)),
    )
    .orderBy(admin.created_at);

  const respondents =
    respondedIds.length === 0
      ? []
      : await db
          .select({
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
          })
          .from(admin)
          .where(and(isNull(admin.deleted_at), inArray(admin.id, respondedIds)))
          .orderBy(admin.created_at);

  return c.json(
    {
      success: true,
      data: {
        total: pending.length + respondents.length,
        responded_count: respondents.length,
        pending_count: pending.length,
        pending,
      },
    },
    200,
  );
}
