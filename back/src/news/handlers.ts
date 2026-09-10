// newsテーブル（type='news' | 'media'）に対する汎用CRUDハンドラ生成
// news APIとmedia APIは同じnewsテーブルをtypeで分けて使うため、ロジックを共通化する

import { createGetAll } from "./getAll.js";
import { createGetById } from "./getById.js";
import { createCreate } from "./create.js";
import { createUpdate } from "./update.js";
import { createRemove } from "./delete.js";
import { createGetCategories } from "./getCategories.js";

// news テーブルは type で3種類を分けて使う
// news: 公開ニュース / media: メディア情報 / notice: 関係者限定の事務連絡
export type NewsType = "news" | "media" | "notice";

export function createNewsTypeHandlers(
  type: NewsType,
  label: string,
  s3Prefix: string,
) {
  return {
    getAll: createGetAll(type),
    getById: createGetById(type, label),
    create: createCreate(type, label, s3Prefix),
    update: createUpdate(type, label, s3Prefix),
    remove: createRemove(type, label),
    getCategories: createGetCategories(type),
  };
}
