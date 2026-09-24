// 汎用CRUDルーター
// 各APIのindex.tsで繰り返されるルート登録（GET一覧/GET詳細/POST/PATCH/DELETE）を共通化する

import { Hono } from "hono";
import type { Context } from "hono";
import { admin } from "../db/schema.js";
import { authToken } from "../db/token.js";
import { requireAdmin } from "../db/roleGuard.js";
import { requireUuidParams } from "./uuidParam.js";

type Variables = {
  user: typeof admin.$inferSelect;
};

type Handler = (c: Context) => Promise<Response> | Response;

export function createCrudRouter(config: {
  basePath: string;
  // PATCHのサブパス（idの後に続く部分） 例: ":imageId" → /basePath/:id/:imageId
  updateSubPath?: string;
  getAll: Handler;
  getById: Handler;
  create: Handler;
  update: Handler;
  remove: Handler;
}) {
  const { basePath, updateSubPath, getAll, getById, create, update, remove } =
    config;
  const updatePath = updateSubPath
    ? `${basePath}/:id/${updateSubPath}`
    : `${basePath}/:id`;

  const app = new Hono<{ Variables: Variables }>();

  app.get(basePath, (c) => getAll(c));
  // :id を含むルートは不正な形式のIDを 404 で弾く（DBの uuid キャスト失敗で 500 にしないため）
  app.get(`${basePath}/:id`, requireUuidParams, (c) => getById(c));
  app.post(basePath, authToken, requireAdmin, (c) => create(c));
  app.patch(updatePath, authToken, requireAdmin, requireUuidParams, (c) => update(c));
  app.delete(`${basePath}/:id`, authToken, requireAdmin, requireUuidParams, (c) => remove(c));

  return app;
}
