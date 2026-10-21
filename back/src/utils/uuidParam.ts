// パスパラメータのUUID形式チェック
//
// 全テーブルの主キー・外部キーは uuid 型なので、"abc" のような値をそのままWHEREに渡すと
// Postgres が uuid へのキャストに失敗して 500 になる。DBに問い合わせる前にここで弾き、
// 「そのIDのデータは存在しない」のと同じ 404 を返す（形式違いか未登録かを区別させない）。

import type { Context, Next } from "hono";

// 8-4-4-4-12 桁の16進数。バージョン・バリアントは問わない
// （テストや既存データで使う 00000000-0000-0000-0000-000000000000 なども通すため）
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 値がUUID形式の文字列か */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/**
 * ルートのパスパラメータ（:id, :imageId など）がすべてUUID形式かを検証するミドルウェア
 * このAPIのパスパラメータはすべてテーブルのIDなので、個別に名前を指定せず全パラメータを見る。
 * 認証・ロールガードの後ろに置き、未ログイン・権限不足は従来どおり 401/403 を優先する。
 */
export async function requireUuidParams(c: Context, next: Next) {
  const params = c.req.param() as Record<string, string>;
  for (const value of Object.values(params)) {
    if (!isUuid(value)) {
      return c.json({ success: false, errors: "指定されたデータが見つかりません。" }, 404);
    }
  }
  await next();
}
