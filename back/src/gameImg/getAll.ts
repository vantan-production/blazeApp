// GET /api/gameImg — 全ての試合風景を取得
// member 以上: 全画像 + consent_status + 原本を返す
// 一般: approved のみ表示（approved 画像が0件の投稿は非表示）

import { desc, eq, and } from "../index.js";
import { count, exists, getTableColumns } from "drizzle-orm";
import {
  db,
  game,
  admin,
  images,
  getOptionalUser,
  isMemberOrAbove,
  parsePage,
  buildPagination,
} from "../shared/index.js";
import { getVisibleGameImages } from "./visibleImages.js";
import type { Context } from "hono";

export const getAll = async (c: Context) => {
  const { page, limit, offset } = parsePage(c);
  const user = await getOptionalUser(c);
  // 関係者（member 以上）は全件と原本を見られる（設計書 §9 C）
  const canViewAll = isMemberOrAbove(user);

  // 一般ユーザーは approved 画像が1枚もない投稿を非表示にするため、DB側でEXISTS絞り込みする
  const visibleCondition = canViewAll
    ? undefined
    : exists(
        db
          .select({ id: images.id })
          .from(images)
          .where(and(eq(images.game_id, game.id), eq(images.consent_status, "approved"))),
      );

  const [all, totalResult] = await Promise.all([
    db
      .select({
        ...getTableColumns(game),
        admin_name: admin.name,
      })
      .from(game)
      .leftJoin(admin, eq(game.admin_id, admin.id))
      .where(visibleCondition)
      .orderBy(desc(game.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(game).where(visibleCondition),
  ]);
  const total = Number(totalResult[0]?.total ?? 0);

  // 可視性フィルタ・署名付きURLの生成はページ対象の投稿のみに対して行う
  const paged = await Promise.all(
    all.map(async (item) => {
      const imageList = await getVisibleGameImages(item.id, user);

      // メイン画像は必ず images テーブル側の先頭から取る。
      // game.img を直接署名すると pickImageKey を通らないため、member 以上でも
      // 原本ではなく公開用（モザイク後）の画像が返り、掲載同意の取り下げも反映されない
      const imgUrl = imageList[0]?.url ?? null;

      return {
        ...item,
        admin_name: item.admin_name ?? "元管理者",
        img_url: imgUrl,
        images: imageList,
      };
    }),
  );

  return c.json(
    {
      success: true,
      data: paged,
      pagination: buildPagination(page, limit, total),
    },
    200,
  );
};
