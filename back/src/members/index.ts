// 関係者エリア API（member 以上）
//
// GET /api/members/gallery                   — 試合風景の原本一覧
// GET /api/members/gallery/:imageId/download — 原本のダウンロードURL発行

import { Hono } from "hono";
import { authToken } from "../shared/index.js";
import { requireMember } from "../db/roleGuard.js";
import { getMemberGallery, downloadOriginal } from "./gallery.js";

const app = new Hono();

// :imageId を含む固定パスを先に登録する
app.get("/api/members/gallery/:imageId/download", authToken, requireMember, (c) =>
  downloadOriginal(c),
);
app.get("/api/members/gallery", authToken, requireMember, (c) => getMemberGallery(c));

export default app;
