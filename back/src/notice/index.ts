// 関係者限定お知らせ API（news テーブルの type='notice' を使う）
//
// GET    /api/notices            — 一覧（member 以上。自分の既読フラグ付き）
// GET    /api/notices/:id        — 詳細（member 以上）
// POST   /api/notices/:id/read   — 既読をつける（member 以上）
// GET    /api/notices/:id/reads  — 既読状況（admin 以上。既読者・未読者の一覧）
// POST   /api/notices            — 投稿（admin 以上）
// PATCH  /api/notices/:id        — 編集（admin 以上）
// DELETE /api/notices/:id        — 削除（admin 以上）
//
// 一覧・詳細は公開APIと違い member 以上を必須にするため、crudRouter ではなく個別に登録する。

import { Hono } from "hono";
import { authToken } from "../shared/index.js";
import { requireAdmin, requireMember } from "../db/roleGuard.js";
import { createNewsTypeHandlers } from "../news/handlers.js";
import { getAllNotices } from "./getAll.js";
import { markAsRead } from "./markRead.js";
import { getReadStatus } from "./getReadStatus.js";

const { getById, create, update, remove } = createNewsTypeHandlers(
  "notice",
  "お知らせ",
  "notice",
);

const app = new Hono();

// :id との衝突を避けるため、固定パスを先に登録する
app.get("/api/notices", authToken, requireMember, (c) => getAllNotices(c));
app.post("/api/notices", authToken, requireAdmin, (c) => create(c));

app.get("/api/notices/:id/reads", authToken, requireAdmin, (c) => getReadStatus(c));
app.post("/api/notices/:id/read", authToken, requireMember, (c) => markAsRead(c));

app.get("/api/notices/:id", authToken, requireMember, (c) => getById(c));
app.patch("/api/notices/:id", authToken, requireAdmin, (c) => update(c));
app.delete("/api/notices/:id", authToken, requireAdmin, (c) => remove(c));

export default app;
