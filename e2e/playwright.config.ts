// 実ブラウザ（Chromium）による E2E の設定
//
// ■ 何を検証するためのテストなのか
// back/src/__tests__ のテストは app.request() で Hono のハンドラを直接呼ぶため、
// Set-Cookie から "token=..." を正規表現で切り出し、手で Cookie ヘッダに詰め直している
// （back/src/__tests__/testHelpers.ts の extractCookie）。
// つまり HttpOnly / Secure / SameSite / Path といった**属性を誰も解釈していない**。
// 属性を壊しても既存テストは全て通るため、ここだけは実ブラウザで検証する。
//
// ■ 起動するもの
//   1. back の API（localhost:8080）… テスト用 Postgres / Redis に接続する
//   2. 静的ページ配信（localhost:3100 / evil.test:3100）… ブラウザのオリジンを用意する
// Postgres / Redis は back/docker-compose.test.yml のものを使う（npm run db:up）。

import { defineConfig, devices } from "@playwright/test";

const API_PORT = 8080;
const HARNESS_PORT = 3100;

/** ブラウザが「アプリのページ」として見るオリジン。API と同一サイト（どちらも localhost） */
export const APP_ORIGIN = `http://localhost:${HARNESS_PORT}`;
/** 攻撃者サイト相当のオリジン。localhost とは別サイトなので SameSite 判定が効く */
export const EVIL_ORIGIN = `http://evil.test:${HARNESS_PORT}`;
export const API_ORIGIN = `http://localhost:${API_PORT}`;

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://test:test@localhost:5433/test_db";
const TEST_REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6380";

export default defineConfig({
  testDir: "./tests",
  // Cookie は1つのブラウザコンテキストに溜まる共有状態なので並列実行しない
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: APP_ORIGIN,
    trace: "retain-on-failure",
  },

  projects: [
    // 前提データ（owner アカウント）の用意。webServer の起動後に実行される
    { name: "seed", testMatch: /seed\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["seed"],
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // evil.test を 127.0.0.1 に解決させる。/etc/hosts を触らずに
          // 「localhost とは別サイト」のオリジンを作るための指定
          args: [`--host-resolver-rules=MAP evil.test 127.0.0.1`],
        },
      },
    },
  ],

  webServer: [
    {
      // back を本物の HTTP サーバーとして起動する（tsx watch ではなく単発実行）
      command: "npx tsx src/server.ts",
      cwd: "../back",
      url: `${API_ORIGIN}/health`,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        PORT: String(API_PORT),
        // NODE_ENV=test にする理由は2つ。
        //  - ローカルDockerの Postgres は SSL 非対応（back/src/db/index.ts）
        //  - 各APIのレートリミットが素通しになる（何度ログインしても429にならない）
        // Cookie の属性は NODE_ENV に依存しないので、検証対象には影響しない
        NODE_ENV: "test",
        DATABASE_URL: TEST_DATABASE_URL,
        REDIS_URL: TEST_REDIS_URL,
        // 攻撃者サイトからのリクエストも CORS では通す。
        // ここで CORS に弾かれると「Cookie が送られなかったのか、CORSで落ちたのか」が
        // 区別できず、SameSite の検証にならないため意図的に許可している
        CORS_ORIGIN: `${APP_ORIGIN},${EVIL_ORIGIN}`,
        FRONTEND_URL: APP_ORIGIN,
        MAIL_FROM: "e2e@example.com",
        AWS_REGION: "ap-northeast-1",
        AWS_ACCESS_KEY_ID: "test",
        AWS_SECRET_ACCESS_KEY: "test",
        AWS_S3_BUCKET: "test-bucket",
      },
    },
    {
      command: "node harness/server.mjs",
      url: `${APP_ORIGIN}/__health`,
      reuseExistingServer: !process.env.CI,
      env: { HARNESS_PORT: String(HARNESS_PORT) },
    },
  ],
});
