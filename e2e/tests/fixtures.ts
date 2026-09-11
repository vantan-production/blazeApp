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

export const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://test:test@localhost:5433/test_db";
export const TEST_REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6380";

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
