// レート制限（hono-rate-limiter + Redis ストア）の実測テスト
//
// ■ なぜ独立したテストが必要なのか
// 本番の各ルート（login / register / forgotPassword / resetPassword /
// accountRecover / inquiry / trial）のリミッターは
// `process.env.NODE_ENV === "test"` のとき素通しの中間ハンドラに差し替わる。
// これは他のテストが429で落ちないようにするための意図的な措置だが、その結果
// 「Redis に繋がるリミッターそのもの」はどのテストからも一度も実行されていなかった。
// ここでは本番と同じ redisClient・同じ RedisStore の結線でリミッターを組み立て、
// 実際の Redis（.env.test の REDIS_URL）に対して挙動を実測する。
//
// ■ 何を保証したいのか
// 「上限を超えたら429」だけでなく、カウンタが**プロセス外の Redis に載っている**こと。
// ECS のタスクは複数走る前提なので、メモリストアに落ちていると
// タスク数だけ上限が緩む（5回/分のつもりが 5×タスク数/分になる）。
// この差はレスポンスだけを見ても分からないため、Redis のキーとTTLまで確認する。

import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { rateLimiter, RedisStore } from "../index.js";
import { redisClient } from "../shared/index.js";

// 本番各ルートと同一の結線。ここを変えたら本番側も変わっていないか確認すること
const redisStore = () =>
  new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    // biome-ignore lint/suspicious/noExplicitAny: 本番コードと同じく express-rate-limit 用 Store の型差を吸収する
  }) as any;

/**
 * 検証用のアプリを組み立てる。
 * キーはテスト側から自由に切り替えたいので X-Test-Client ヘッダから採る
 * （本番の keyGenerator が実IPをどう決めるかは monitoring.test.ts の clientIp() 側で検証する）。
 */
const buildApp = (config: { windowMs: number; limit: number; message: string }) => {
  const app = new Hono();
  app.use(
    "*",
    rateLimiter({
      windowMs: config.windowMs,
      limit: config.limit,
      message: config.message,
      keyGenerator: (c) => c.req.header("x-test-client") ?? "unknown",
      store: redisStore(),
    }),
  );
  app.post("/", (c) => c.json({ success: true }));
  return app;
};

/** client を名乗って POST する */
const post = (app: Hono, client: string) =>
  app.request("/", { method: "POST", headers: { "X-Test-Client": client } });

beforeEach(async () => {
  if (!redisClient.isOpen) await redisClient.connect();
  // 前のテストが残したカウンタで上限に達しないようにする
  await redisClient.flushDb();
});

describe("レート制限の基本動作", () => {
  it("上限までは通し、超えた分は429と案内文を返す（ログインの5回/分と同条件）", async () => {
    const app = buildApp({
      windowMs: 60 * 1000,
      limit: 5,
      message: "ログイン試行回数の上限に達しました、1分後に再試行してください。",
    });

    for (let i = 1; i <= 5; i++) {
      const res = await post(app, "192.0.2.1");
      expect(res.status, `${i}回目は通るはず`).toBe(200);
    }

    const blocked = await post(app, "192.0.2.1");
    expect(blocked.status).toBe(429);
    expect(await blocked.text()).toBe(
      "ログイン試行回数の上限に達しました、1分後に再試行してください。",
    );
  });

  it("1回/分の設定では2回目から弾く（問い合わせ・体験申し込みと同条件）", async () => {
    const app = buildApp({
      windowMs: 60 * 1000,
      limit: 1,
      message: "1分間に1回しか送信できません。",
    });

    expect((await post(app, "192.0.2.2")).status).toBe(200);
    const blocked = await post(app, "192.0.2.2");
    expect(blocked.status).toBe(429);
    expect(await blocked.text()).toBe("1分間に1回しか送信できません。");
  });

  it("キー（IP）ごとに独立して数える。他人の試行で巻き込まれない", async () => {
    const app = buildApp({ windowMs: 60 * 1000, limit: 2, message: "上限です" });

    await post(app, "192.0.2.3");
    await post(app, "192.0.2.3");
    expect((await post(app, "192.0.2.3")).status).toBe(429);

    // 別IPは無傷
    expect((await post(app, "192.0.2.4")).status).toBe(200);
  });

  it("ウィンドウを過ぎればカウンタが切れて再び通る", async () => {
    const app = buildApp({ windowMs: 1000, limit: 1, message: "上限です" });

    expect((await post(app, "192.0.2.5")).status).toBe(200);
    expect((await post(app, "192.0.2.5")).status).toBe(429);

    // Redis のキー自身の TTL 失効に任せる（1秒 + 余裕）
    await new Promise((resolve) => setTimeout(resolve, 1300));

    expect((await post(app, "192.0.2.5")).status).toBe(200);
  });
});

describe("カウンタの保存先が Redis であること", () => {
  it("試行回数が Redis のキーとして残り、windowMs 相当の TTL が付く", async () => {
    const app = buildApp({ windowMs: 60 * 1000, limit: 5, message: "上限です" });

    await post(app, "192.0.2.6");
    await post(app, "192.0.2.6");

    const keys = await redisClient.keys("*");
    const key = keys.find((k) => k.includes("192.0.2.6"));
    expect(key, `Redis にカウンタが無い（メモリストアに落ちている疑い）: ${keys.join(",")}`)
      .toBeDefined();

    // 2回試行したので値は 2
    expect(await redisClient.get(key as string)).toBe("2");

    // TTL がウィンドウ（60秒）以内に設定されている＝いつか必ず解除される
    const ttl = await redisClient.ttl(key as string);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it("別インスタンスのリミッターでもカウンタを共有する（ECSのタスクが複数でも上限が緩まない）", async () => {
    const config = { windowMs: 60 * 1000, limit: 3, message: "上限です" };
    // 同じ Redis を見る、別々のアプリ＝別タスク相当
    const task1 = buildApp(config);
    const task2 = buildApp(config);

    expect((await post(task1, "192.0.2.7")).status).toBe(200);
    expect((await post(task2, "192.0.2.7")).status).toBe(200);
    expect((await post(task1, "192.0.2.7")).status).toBe(200);

    // 3回目までは通り、どちらのタスクに当たっても4回目は弾かれる
    expect((await post(task2, "192.0.2.7")).status).toBe(429);
    expect((await post(task1, "192.0.2.7")).status).toBe(429);
  });
});
