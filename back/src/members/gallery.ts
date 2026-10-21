// 関係者向け 試合風景ギャラリー（member 以上）
//
// GET /api/members/gallery                     — 原本一覧（掲載同意ステータスを問わず全件）
// GET /api/members/gallery/:imageId/download   — 原本のダウンロードURL発行
//
// 公開ギャラリー（/api/gameImg）が「approved のみ・モザイク適用後」なのに対し、
// こちらは全件・原本を返す。未成年を含む肖像を扱うため、認証を必須にしている。

import { desc, eq } from "../index.js";
import { count, isNotNull } from "drizzle-orm";
import {
  db,
  images,
  game,
  admin,
  getPresignedDownloadUrl,
  parsePage,
  buildPagination,
} from "../shared/index.js";
import { pickImageKey } from "../gameImg/visibleImages.js";
import type { Context } from "hono";

// 原本のダウンロードURLの有効期限（発行から5分）。
// 一覧の閲覧用URLより短くして、リンクが出回りにくいようにする。
const DOWNLOAD_URL_TTL_SECONDS = 300;

// GET /api/members/gallery
export async function getMemberGallery(c: Context) {
  const { page, limit, offset } = parsePage(c);

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: images.id,
        path: images.path,
        original_path: images.original_path,
        consent_status: images.consent_status,
        created_at: images.created_at,
        game_id: images.game_id,
        game_created_at: game.created_at,
        admin_name: admin.name,
      })
      .from(images)
      .innerJoin(game, eq(images.game_id, game.id))
      .leftJoin(admin, eq(game.admin_id, admin.id))
      .where(isNotNull(images.game_id))
      .orderBy(desc(images.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(images).where(isNotNull(images.game_id)),
  ]);

  const data = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      game_id: row.game_id,
      consent_status: row.consent_status,
      created_at: row.created_at,
      admin_name: row.admin_name ?? "元管理者",
      // モザイク前の原本。退避が無い画像（モザイク未適用）は path がそのまま原本
      url: await getPresignedDownloadUrl(pickImageKey(row, true)),
      is_original: row.original_path !== null,
    })),
  );

  return c.json(
    {
      success: true,
      data,
      pagination: buildPagination(page, limit, Number(totalResult[0]?.total ?? 0)),
    },
    200,
  );
}

// GET /api/members/gallery/:imageId/download
export async function downloadOriginal(c: Context) {
  const imageId = c.req.param("imageId");
  if (!imageId) {
    return c.json({ success: false, errors: "IDが指定されていません。" }, 400);
  }

  const rows = await db.select().from(images).where(eq(images.id, imageId));
  const image = rows[0];

  if (!image || !image.game_id) {
    return c.json(
      { success: false, errors: "試合風景の画像が見つかりません。" },
      404,
    );
  }

  const key = pickImageKey(image, true);

  return c.json(
    {
      success: true,
      data: {
        id: image.id,
        url: await getPresignedDownloadUrl(key, DOWNLOAD_URL_TTL_SECONDS),
        is_original: image.original_path !== null,
        expires_in: DOWNLOAD_URL_TTL_SECONDS,
      },
    },
    200,
  );
}
