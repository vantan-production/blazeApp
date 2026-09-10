// 試合風景画像を閲覧者の権限に応じて取得する共通ヘルパー
//
// 一般ユーザー: consent_status='approved' のみ・モザイク適用後の公開用画像（path）
// member 以上 : 全件・原本（original_path。モザイク前の画像が退避されていなければ path）
//
// member に原本を見せるのは設計書（docs/role-design.md §9 C）の要件。
// 未成年を含む肖像を扱うため、原本は「ログインした関係者」にだけ渡す。

import { and, eq } from "../index.js";
import {
  db,
  images,
  getPresignedDownloadUrl,
  consentStatusSchema,
  isMemberOrAbove,
} from "../shared/index.js";
import type { z } from "../index.js";
import type { admin } from "../db/schema.js";

type ConsentStatus = z.infer<typeof consentStatusSchema>;
type User = typeof admin.$inferSelect;

export type VisibleGameImage = {
  id: string;
  url: string;
  consent_status?: ConsentStatus;
  // 原本を見ているかどうか（member 以上で、かつモザイク適用済みの画像のときだけ true）
  is_original?: boolean;
};

/** 閲覧者に見せるS3キー。member 以上には退避済みの原本を優先して返す */
export const pickImageKey = (
  record: { path: string; original_path: string | null },
  canViewOriginal: boolean,
): string => (canViewOriginal ? (record.original_path ?? record.path) : record.path);

export async function getVisibleGameImages(
  gameId: string,
  viewer: User | null,
): Promise<VisibleGameImage[]> {
  const canViewAll = isMemberOrAbove(viewer);

  const records = await db
    .select()
    .from(images)
    .where(
      canViewAll
        ? eq(images.game_id, gameId)
        : and(eq(images.game_id, gameId), eq(images.consent_status, "approved")),
    );

  return Promise.all(
    records.map(async (record) => ({
      id: record.id,
      url: await getPresignedDownloadUrl(pickImageKey(record, canViewAll)),
      // DBへの書き込みはconsentStatusSchemaのバリデーションを経由するため、値はConsentStatusのいずれかである
      ...(canViewAll && {
        consent_status: record.consent_status as ConsentStatus,
        is_original: record.original_path !== null,
      }),
    })),
  );
}
