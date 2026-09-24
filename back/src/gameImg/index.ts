// 試合風景API（8エンドポイント）

import { Hono } from "hono";
import { createCrudRouter } from "../shared/index.js";
import { authToken } from "../db/token.js";
import { requireAdmin } from "../db/roleGuard.js";
import { getAll } from "./getAll.js";
import { getById } from "./getById.js";
import { create } from "./create.js";
import { update } from "./update.js";
import { remove } from "./delete.js";
import { updateConsent } from "./updateConsent.js";
import { applyMosaic } from "./applyMosaic.js";
import { getMosaic } from "./getMosaic.js";
import { removeMosaic } from "./removeMosaic.js";

const crudApp = createCrudRouter({
  basePath: "/api/gameImg",
  updateSubPath: ":imageId",
  getAll,
  getById,
  create,
  update,
  remove,
});

const app = new Hono();
app.route("/", crudApp);

// PATCH /api/gameImg/images/:imageId/consent — 掲載同意ステータス更新（管理者のみ）
app.patch(
  "/api/gameImg/images/:imageId/consent",
  authToken,
  requireAdmin,
  (c) => updateConsent(c),
);

// GET /api/gameImg/images/:imageId/mosaic — 適用中のモザイク領域と原本を取得（管理者のみ）
app.get(
  "/api/gameImg/images/:imageId/mosaic",
  authToken,
  requireAdmin,
  (c) => getMosaic(c),
);

// POST /api/gameImg/images/:imageId/mosaic — モザイク領域を適用・再編集（管理者のみ）
app.post(
  "/api/gameImg/images/:imageId/mosaic",
  authToken,
  requireAdmin,
  (c) => applyMosaic(c),
);

// DELETE /api/gameImg/images/:imageId/mosaic — モザイクを解除して原本に戻す（管理者のみ）
app.delete(
  "/api/gameImg/images/:imageId/mosaic",
  authToken,
  requireAdmin,
  (c) => removeMosaic(c),
);

export default app;
