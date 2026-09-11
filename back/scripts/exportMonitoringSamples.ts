// 監視ログのサンプル行を書き出す
//
// CloudWatch のメトリクスフィルタ（infra/lib/backend-stack.ts）が本当にこのログ行に
// 一致するかを、デプロイせずに検証するために使う。
// 手で書いた「それらしいJSON」ではなく、実際に app を動かして得た生の出力を書き出すのが肝。
// フィールド名を1文字変えただけでアラームは静かに鳴らなくなるため、
// 両者が食い違っていないことを機械で突き合わせられるようにする。
//
//   npm run monitoring:samples > /tmp/samples.ndjson
//   infra/scripts/verify-metric-filters.sh /tmp/samples.ndjson
//
// 前提: テスト用の Postgres / Redis が起動していること（docker-compose.test.yml）

import "dotenv/config";
import { app } from "../src/app.js";
import { db } from "../src/db/index.js";
import { sql } from "drizzle-orm";
import { createOwnerAccount } from "../src/admin/createOwner.js";
import { setMonitoringSink } from "../src/utils/monitoring.js";

const ORIGIN = process.env.CORS_ORIGIN?.split(",")[0] ?? "http://localhost:3000";
const EMAIL = "monitoring-sample@example.com";
const PASSWORD = "Test@Password1!";

const lines: string[] = [];
setMonitoringSink((line) => lines.push(line));

// 検証用の経路を先に登録する（Hono は最初のリクエスト以降ルートを追加できない）。
// このスクリプトのプロセス内だけの登録で、サーバー（src/server.ts）には影響しない。
// 種別の判定はステータスとパスだけで決まる（monitoring.ts の classify）ため、
// ロールや Redis の状態を作り込まなくても本物と同じ形のログ行が得られる
app.get("/__sample/boom", () => {
  throw new Error("サンプル用の意図的な例外");
});
app.get("/__sample/forbidden", (c) => c.json({ success: false }, 403));
app.get("/__sample/rate-limited", (c) => c.json({ success: false }, 429));

async function main() {
  await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);
  await createOwnerAccount({ name: "Sample Owner", email: EMAIL, password: PASSWORD });

  const json = { "Content-Type": "application/json", Origin: ORIGIN };

  // login_succeeded
  const ok = await app.request("/api/admin/login", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const cookie = (ok.headers.get("set-cookie") ?? "").match(/token=[^;]*/)?.[0] ?? "";

  // login_failed
  await app.request("/api/admin/login", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ email: EMAIL, password: "Wrong@Password1!" }),
  });

  // token_invalid
  await app.request("/api/admin/me", {
    headers: { Cookie: "token=deadbeef", Origin: ORIGIN },
  });

  // probe
  await app.request("/wp-login.php", { headers: { Origin: ORIGIN } });

  // csrf_rejected（許可していないオリジンからのフォーム送信）
  await app.request("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://evil.example.com",
    },
    body: `email=${EMAIL}&password=${PASSWORD}`,
  });

  // forbidden / rate_limited
  await app.request("/__sample/forbidden", { headers: { Cookie: cookie, Origin: ORIGIN } });
  await app.request("/__sample/rate-limited", { headers: { Origin: ORIGIN } });

  // APP_ERROR（未捕捉例外）
  await app.request("/__sample/boom", { headers: { Origin: ORIGIN } });

  if (!cookie) throw new Error("ログインに失敗したためサンプルを生成できません");

  process.stdout.write(`${lines.join("\n")}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
