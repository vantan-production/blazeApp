// 前提データの用意（Playwright の setup project として、webServer 起動後に1回だけ実行される）
//
// back のマイグレーションは server.ts の起動時に自動適用される（runMigrations）。
// webServer の url（/health）が応答した時点で適用済みなので、ここでは
// テーブルを空にして owner を1人作るだけでよい。

import { test as setup, expect } from "@playwright/test";
import pg from "pg";
import { API_ORIGIN, OWNER, TEST_DATABASE_URL, runCreateOwner } from "./fixtures.js";

setup("owner アカウントを用意する", async ({ request }) => {
  // マイグレーション完了の確認（webServer の待機と二重だが、失敗時の原因を分かりやすくするため）
  const health = await request.get(`${API_ORIGIN}/health`);
  expect(health.status()).toBe(200);

  const pool = new pg.Pool({ connectionString: TEST_DATABASE_URL, ssl: false });
  try {
    // create:owner は owner が既に居ると何もしないので、先に空にしておく。
    // users を消せば関連レコードも CASCADE で落ちる
    await pool.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE");
  } finally {
    await pool.end();
  }

  await runCreateOwner();

  // 作成した owner で実際にログインできることだけ確認しておく
  // （ここが失敗したらテスト本体ではなく前提の問題だと切り分けられる）
  const login = await request.post(`${API_ORIGIN}/api/admin/login`, {
    data: { email: OWNER.email, password: OWNER.password },
  });
  expect(login.status()).toBe(200);
});
