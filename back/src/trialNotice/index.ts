// 体験申込者への連絡 API（保護者向け連絡事項を、管理者が選んだ体験申込者にだけメールで届ける）
//
// GET  /api/trial-notices/candidates  — 送信先に選べる申込者の一覧（admin 以上）
// GET  /api/trial-notices             — 送信履歴（admin 以上）
// GET  /api/trial-notices/:id         — 送信履歴の詳細と宛先（admin 以上）
// POST /api/trial-notices             — 選んだ申込者へ連絡メールを送信（admin 以上）

import { Hono } from "hono";
import { requireAdmin } from "../db/roleGuard.js";
import { authToken } from "../shared/index.js";
import { create } from "./create.js";
import { getAll } from "./getAll.js";
import { getById } from "./getById.js";
import { getCandidates } from "./getCandidates.js";

const app = new Hono();

// /candidates は /:id より先に登録する（"candidates" が id として解釈されないように）
app.get("/api/trial-notices/candidates", authToken, requireAdmin, (c) => getCandidates(c));
app.get("/api/trial-notices", authToken, requireAdmin, (c) => getAll(c));
app.get("/api/trial-notices/:id", authToken, requireAdmin, (c) => getById(c));
app.post("/api/trial-notices", authToken, requireAdmin, (c) => create(c));

export default app;
