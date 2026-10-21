// 試合結果API（5エンドポイント）
//
// GET    /api/match-results     — 一覧（誰でも。試合日の新しい順）
// GET    /api/match-results/:id — 詳細（誰でも）
// POST   /api/match-results     — 作成（admin 以上）
// PATCH  /api/match-results/:id — 更新（admin 以上）
// DELETE /api/match-results/:id — 削除（admin 以上）

import { createCrudRouter } from "../shared/index.js";
import { create, getAll, getById, remove, update } from "./handlers.js";

export default createCrudRouter({
  basePath: "/api/match-results",
  getAll,
  getById,
  create,
  update,
  remove,
});
