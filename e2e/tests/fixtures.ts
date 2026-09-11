// E2E 共通の定数とヘルパー

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Page } from "@playwright/test";

const execFileAsync = promisify(execFile);

export const API_ORIGIN = "http://localhost:8080";
export const APP_ORIGIN = "http://localhost:3100";
export const EVIL_ORIGIN = "http://evil.test:3100";

export const OWNER = {
  name: "E2E Owner",
  email: "e2e-owner@example.com",
  password: "Test@Password1!",
};

// 接続先は E2E 専用の環境変数だけで上書きできる。
// DATABASE_URL には開発用DBが入っていることがあり、それを拾うと
//   1. webServer が起動した back が、その開発用DBにマイグレーションを適用する
//   2. その後に走る seed が TRUNCATE ... CASCADE を投げる
// という順序で、ガードが効く前に開発中のデータが壊れる。だから読まない。
export const TEST_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://test:test@localhost:5433/test_db";
export const TEST_REDIS_URL =
  process.env.E2E_REDIS_URL ?? "redis://localhost:6380";

/**
 * 接続先がテスト用DBであることを確かめる。
 *
 * E2E_DATABASE_URL で任意のDBを指せてしまうため、「ローカルホストかつ
 * DB名に test を含む」ことを条件に機械的に弾く。
 *
 * **呼ぶ場所が重要**: back は起動時に runMigrations() を走らせるので、
 * webServer が上がった後（seed の中）では遅い。playwright.config.ts の
 * 読み込み時＝どのプロセスも起動する前に呼ぶこと。
 */
export function assertTestDatabase(url = TEST_DATABASE_URL): void {
  let dbName: string;
  let host: string;
  try {
    const parsed = new URL(url);
    dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    // IPv6 は URL.hostname がブラケット付きの "[::1]" を返す
    host = parsed.hostname.replace(/^\[|\]$/g, "");
  } catch {
    throw new Error("E2E_DATABASE_URL を URL として解釈できませんでした。");
  }

  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!isLocalHost || !/(^|[_-])test(_|$)/.test(dbName)) {
    throw new Error(
      "E2E は users を CASCADE で削除するため、ローカルのテスト用DBでしか実行できません。\n" +
        `接続先: host=${host} db=${dbName}\n` +
        "back/docker-compose.test.yml の DB を指すよう E2E_DATABASE_URL を設定してください。",
    );
  }
}

/** back の create:owner スクリプトを実行する（本番と同じ作成経路を使う） */
export async function runCreateOwner(): Promise<void> {
  await execFileAsync(
    "npm",
    [
      "run",
      "create:owner",
      "--silent",
      "--",
      `--name=${OWNER.name}`,
      `--email=${OWNER.email}`,
      `--password=${OWNER.password}`,
    ],
    {
      cwd: new URL("../../back/", import.meta.url).pathname,
      // back/.env の値を拾わせない。REDIS_URL を渡さないと create:owner が
      // 開発用Redis(6379)に繋ごうとして失敗する（shared/index.js が起動時にRedisへ接続するため）
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        REDIS_URL: TEST_REDIS_URL,
        NODE_ENV: "test",
      },
    },
  );
}

export type FetchResult = {
  status: number;
  body: unknown;
};

/**
 * ブラウザのページコンテキスト内で API を叩く。
 *
 * fetch のオプションは front/lib/apiClient.ts と同じ条件に揃えている。
 * 肝は credentials: "include" だけで、Cookie ヘッダを**一切自分で組み立てない**こと。
 * 送るか送らないかの判断はすべてブラウザに委ねる。そこが検証対象なので、
 * テスト側が手で Cookie を詰めた瞬間にこのテストは無意味になる。
 */
export async function apiFetch(
  page: Page,
  endpoint: string,
  init: {
    method?: string;
    body?: unknown;
    credentials?: "include" | "omit";
  } = {},
): Promise<FetchResult> {
  return page.evaluate(
    async ({ origin, endpoint, init }) => {
      const res = await fetch(`${origin}${endpoint}`, {
        method: init.method ?? "GET",
        headers: { "Content-Type": "application/json" },
        credentials: init.credentials ?? "include",
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      return { status: res.status, body };
    },
    { origin: API_ORIGIN, endpoint, init },
  );
}

/** ブラウザに保存された token Cookie を取り出す（無ければ undefined） */
export async function tokenCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((c) => c.name === "token");
}
