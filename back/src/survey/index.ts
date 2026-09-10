// アンケート／出欠確認 API
//
// GET    /api/surveys              — 一覧（member 以上。自分の回答状況付き）
// GET    /api/surveys/:id          — 詳細（member 以上。選択肢と自分の回答）
// POST   /api/surveys/:id/responses — 回答（member 以上。締切後は 400）
// GET    /api/surveys/:id/results  — 集計結果（admin 以上）
// GET    /api/surveys/:id/pending  — 未回答者一覧（admin 以上）
// POST   /api/surveys              — 作成（admin 以上）
// PATCH  /api/surveys/:id          — 編集（admin 以上）
// DELETE /api/surveys/:id          — 削除（admin 以上）

import { Hono } from "hono";
import { authToken } from "../shared/index.js";
import { requireAdmin, requireMember } from "../db/roleGuard.js";
import { getAllSurveys, getSurveyById } from "./read.js";
import { respondToSurvey } from "./respond.js";
import { getSurveyResults, getPendingRespondents } from "./results.js";
import { createSurvey, updateSurvey, removeSurvey } from "./manage.js";

const app = new Hono();

app.get("/api/surveys", authToken, requireMember, (c) => getAllSurveys(c));
app.post("/api/surveys", authToken, requireAdmin, (c) => createSurvey(c));

// :id 単体より先に、サブパスを持つルートを登録する
app.post("/api/surveys/:id/responses", authToken, requireMember, (c) =>
  respondToSurvey(c),
);
app.get("/api/surveys/:id/results", authToken, requireAdmin, (c) =>
  getSurveyResults(c),
);
app.get("/api/surveys/:id/pending", authToken, requireAdmin, (c) =>
  getPendingRespondents(c),
);

app.get("/api/surveys/:id", authToken, requireMember, (c) => getSurveyById(c));
app.patch("/api/surveys/:id", authToken, requireAdmin, (c) => updateSurvey(c));
app.delete("/api/surveys/:id", authToken, requireAdmin, (c) => removeSurvey(c));

export default app;
