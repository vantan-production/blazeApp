// 公開フォーム（問い合わせ・体験申し込み）送信のレートリミット
//
// 問い合わせと体験申し込みは同じ条件（1分に1回・Redisで全タスク共有）なので、設定をここにまとめる。
// NODE_ENV=test での素通しは呼び出し側（各 index.ts）で行う。
// ここではテストからも本番と同じ設定のリミッターを組み立てられるようにしておく（rateLimit.test.ts）。

import type { Context } from "hono";
import { RedisStore, rateLimiter } from "../index.js";
import { redisClient } from "../shared/index.js";

// 429 時の案内文。フロントはこの文言をそのまま表示する
export const FORM_RATE_LIMIT_MESSAGE = "1分間に1回しか送信できません。";

/**
 * 公開フォーム送信用のレートリミッターを組み立てる
 * @param prefix - Redis のキー接頭辞。フォームごとに分ける
 *   （同じだと、問い合わせを送った直後に体験申し込みをしただけで429になるため）
 * @param keyGenerator - 送信者を識別するキー（通常は clientIp）
 */
export function createFormRateLimiter(config: {
  prefix: string;
  keyGenerator: (c: Context) => string | Promise<string>;
}) {
  return rateLimiter({
    windowMs: 60 * 1000,
    limit: 1,
    // 他のAPIのエラーと同じ { success, errors } 形式で返す（文字列だと text/plain になる）
    message: { success: false, errors: FORM_RATE_LIMIT_MESSAGE },
    // 入力ミス（400）などで失敗した送信は数えない。
    // 数えてしまうと、誤字を直してすぐ送り直した利用者が1分間429で弾かれる。
    // 成功扱いは既定どおり status < 400。失敗時はレスポンス後にカウンタを戻す（Redis の DECR）
    skipFailedRequests: true,
    keyGenerator: config.keyGenerator,
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: config.prefix,
      // biome-ignore lint/suspicious/noExplicitAny: express-rate-limit 用 Store と hono-rate-limiter の Store の型差を吸収する
    }) as any,
  });
}
