// 体験申し込みAPI（3エンドポイント）

import { Hono, rateLimiter, RedisStore } from "../index.js";
import { admin, authToken, redisClient } from "../shared/index.js";
import { requireAdmin } from "../db/roleGuard.js";
import { getAll } from "./getAll.js";
import { getById } from "./getById.js";
import { create } from "./create.js";
import { clientIp } from "../utils/monitoring.js";

type Variables = {
  user: typeof admin.$inferSelect;
};

const app = new Hono<{ Variables: Variables }>();

// 体験申し込みのレートリミット（1分に1回まで・テスト環境ではスキップ）
const trialLimiter =
  process.env.NODE_ENV === "test"
    ? (_c: unknown, next: () => Promise<void>) => next()
    : rateLimiter({
        windowMs: 60 * 1000,
        limit: 1,
        message: "1分間に1回しか送信できません。",
        // ALB配下では接続元IPが常にALBになるため、X-Forwarded-For から実IPを取る。
        // 素の接続元IPで数えると、全利用者が1つのバケットを共有してしまう（monitoring.ts参照）
        keyGenerator: (c) => clientIp(c),
        store: new RedisStore({
          sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        }) as any,
      });

// GET /api/trial-application — 全ての体験申し込みを取得（admin以上）
app.get("/api/trial-application", authToken, requireAdmin, (c) => getAll(c));

// GET /api/trial-application/:id — 特定の体験申し込み内容を取得（admin以上）
app.get("/api/trial-application/:id", authToken, requireAdmin, (c) => getById(c));

// POST /api/trial-application — 体験申し込み（認証不要）
app.post("/api/trial-application", trialLimiter, (c) => create(c));

export default app;
