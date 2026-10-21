// DBと接続

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { buildSslConfig } from "./ssl.js";

if (!process.env.DATABASE_URL) {
  throw new Error("接続に失敗しました。");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // テスト環境はSSL無効、本番環境はRDSのCAバンドルで証明書を厳格に検証、開発環境は暗号化のみ
  // （詳細は ssl.ts。runMigrations もこの pool を使う）
  ssl: buildSslConfig(),
});

export const db = drizzle(pool);
