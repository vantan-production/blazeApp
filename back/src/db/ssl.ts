// DB接続の SSL 設定を環境ごとに組み立てる

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ConnectionOptions } from "node:tls";

// AWS 公式の RDS CA バンドル（全リージョンのルート/中間CA）。
// 取得元: https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
// dist/db/ssl.js（開発時は src/db/ssl.ts）から見て2階層上の certs/ にある。
export const RDS_CA_BUNDLE_PATH = fileURLToPath(
  new URL("../../certs/rds-global-bundle.pem", import.meta.url),
);

/**
 * pg の Pool に渡す ssl 設定を返す。
 * - test: ローカルDocker のDBはSSL非対応のため無効化
 * - production: RDS の CA バンドルを信頼し、証明書を厳格に検証する
 *   （Node の既定の信頼ストアには RDS の CA が入っていないため、ca の指定が必須）
 * - それ以外（開発環境）: 暗号化のみ
 */
export function buildSslConfig(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  caPath: string = RDS_CA_BUNDLE_PATH,
): false | ConnectionOptions {
  if (nodeEnv === "test") return false;
  if (nodeEnv === "production") {
    return { ca: readFileSync(caPath, "utf-8"), rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}
