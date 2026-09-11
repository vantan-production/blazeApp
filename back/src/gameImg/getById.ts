// GET /api/gameImg/:id — 特定の試合風景を取得
// member 以上: 全画像 + consent_status + 原本を返す
// 一般: approved のみ・モザイク適用後の画像を表示

import { eq } from "../index.js";
import { getTableColumns } from "drizzle-orm";
import {
  db,
  game,
  admin,
  getOptionalUser,
  isMemberOrAbove,
} from "../shared/index.js";
import { getVisibleGameImages } from "./visibleImages.js";
import type { Context } from "hono";

export const getById = async (c: Context) => {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const [user, result] = await Promise.all([
    getOptionalUser(c),
    db
      .select({
        ...getTableColumns(game),
        admin_name: admin.name,
      })
      .from(game)
      .leftJoin(admin, eq(game.admin_id, admin.id))
      .where(eq(game.id, id)),
  ]);
  // 関係者（member 以上）は全件と原本を見られる（設計書 §9 C）
  const canViewAll = isMemberOrAbove(user);

  const item = result[0];
  if (!item) return c.json({ success: false, errors: "試合風景が見つかりません。" }, 404);

  const imageList = await getVisibleGameImages(id, user);

  // 一般ユーザーは approved 画像が1枚もない投稿を非表示にする
  if (!canViewAll && imageList.length === 0) {
    return c.json({ success: false, errors: "試合風景が見つかりません。" }, 404);
  }

  // getAll と同じ理由で、メイン画像も images テーブル側の先頭（role に応じたキー）を使う
  const imgUrl = imageList[0]?.url ?? null;

  return c.json(
    {
      success: true,
      data: {
        ...item,
        admin_name: item.admin_name ?? "元管理者",
        img_url: imgUrl,
        images: imageList,
      },
    },
    200,
  );
};
