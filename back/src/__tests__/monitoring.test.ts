// 監視・不正アクセス検知の計装テスト
//
// ここで検証するのは「アラームの元になるログが、期待した種別で1行1JSONとして出るか」。
// CloudWatch のメトリクスフィルタは type / kind をキーに数えるため（infra/lib/backend-stack.ts）、
// このフィールド名と値はインフラ側の設定と対になっている。壊すとアラームが静かに鳴らなくなる。

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { app } from "../app.js";
import { cleanDb } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";
import {
  actorHash,
  classify,
  clientIp,
  errorHandler,
  logAppError,
  resetMonitoringSink,
  securityMonitor,
  setMonitoringSink,
} from "../utils/monitoring.js";

const D = "@monitoring.test";
const ORIGIN = "http://localhost:3000";

type LogLine = Record<string, unknown>;

let captured: LogLine[] = [];

beforeEach(async () => {
  captured = [];
  setMonitoringSink((line) => {
    captured.push(JSON.parse(line) as LogLine);
  });
  await cleanDb();
});

afterEach(() => {
  resetMonitoringSink();
});

/** 捕捉したログから指定した kind のものを返す */
const eventsOf = (kind: string): LogLine[] =>
  captured.filter((e) => e.type === "SECURITY_EVENT" && e.kind === kind);

// --- 種別判定のロジック ---

describe("classify()", () => {
  it("ログインの成否を種別に分ける", () => {
    expect(classify("/api/admin/login", 200, false, true)).toBe("login_succeeded");
    expect(classify("/api/admin/login", 401, false, true)).toBe("login_failed");
    // 削除済みアカウントへのログイン（403）も試行として数える
    expect(classify("/api/admin/login", 403, false, true)).toBe("login_failed");
    // 入力不正（400）は攻撃の信号にならないので記録しない
    expect(classify("/api/admin/login", 400, false, true)).toBeNull();
    // ただしオリジン不正による403は、パスワード間違いではなくCSRFとして扱う
    expect(classify("/api/admin/login", 403, false, false)).toBe("csrf_rejected");
  });

  it("Cookie を持つ 401 だけを token_invalid として記録する", () => {
    // 未ログインの利用者による 401 は大量に出るためノイズとして捨てる
    expect(classify("/api/admin/me", 401, false, true)).toBeNull();
    expect(classify("/api/admin/me", 401, true, true)).toBe("token_invalid");
  });

  it("403 を権限不足と CSRF 拒否に切り分ける", () => {
    expect(classify("/api/admin/users", 403, true, true)).toBe("forbidden");
    expect(classify("/api/admin/users", 403, true, false)).toBe("csrf_rejected");
  });

  it("429・404・5xx をそれぞれの種別にする", () => {
    expect(classify("/api/admin/login", 429, false, true)).toBe("rate_limited");
    expect(classify("/api/nonexistent", 404, false, true)).toBe("probe");
    expect(classify("/api/news", 500, false, true)).toBe("server_error");
  });
});

// --- クライアントIPの特定 ---

describe("clientIp()", () => {
  const ipApp = new Hono().get("/ip", (c) => c.text(clientIp(c)));

  it("X-Forwarded-For の末尾を採用する（ALBが追記した実IP）", async () => {
    const res = await ipApp.request("/ip", {
      headers: { "X-Forwarded-For": "203.0.113.9" },
    });
    expect(await res.text()).toBe("203.0.113.9");
  });

  it("クライアントが偽の X-Forwarded-For を詰めても、ALBが追記した末尾が勝つ", async () => {
    const res = await ipApp.request("/ip", {
      // 攻撃者が "1.1.1.1" を自称 → ALB が実IPを右に追記する
      headers: { "X-Forwarded-For": "1.1.1.1, 203.0.113.9" },
    });
    expect(await res.text()).toBe("203.0.113.9");
  });
});

// --- アプリ全体に組み込まれた状態での記録 ---

describe("securityMonitor（app 全体）", () => {
  it("ログイン失敗を login_failed として記録し、生のメールアドレスは載せない", async () => {
    await registerAndLogin("Owner", `owner${D}`);

    const res = await app.request("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ email: `owner${D}`, password: "Wrong@Password1!" }),
    });
    expect(res.status).toBe(401);

    const failures = eventsOf("login_failed");
    expect(failures).toHaveLength(1);
    const event = failures[0]!;
    expect(event.severity).toBe("warn");
    expect(event.path).toBe("/api/admin/login");
    expect(event.status).toBe(401);
    // 同一アカウントへの総当たりを突き合わせるためのハッシュ
    expect(event.actor).toBe(actorHash(`owner${D}`));
    // 生のメールアドレス・パスワードが漏れていないこと
    expect(JSON.stringify(event)).not.toContain(`owner${D}`);
    expect(JSON.stringify(event)).not.toContain("Wrong@Password1!");
  });

  it("ログイン成功も記録する（侵入後の追跡に必要）", async () => {
    await registerAndLogin("Owner", `owner${D}`);
    const events = eventsOf("login_succeeded");
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]!.severity).toBe("info");
  });

  it("無効なトークンでのアクセスを token_invalid として記録する", async () => {
    const res = await app.request("/api/admin/me", {
      headers: { Cookie: "token=deadbeef", Origin: ORIGIN },
    });
    expect(res.status).toBe(401);
    expect(eventsOf("token_invalid")).toHaveLength(1);
  });

  it("Cookie の無い 401 は記録しない（未ログイン閲覧のノイズを除く）", async () => {
    const res = await app.request("/api/admin/me", { headers: { Origin: ORIGIN } });
    expect(res.status).toBe(401);
    expect(eventsOf("token_invalid")).toHaveLength(0);
  });

  it("権限不足のアクセスを forbidden として、誰が叩いたかと共に記録する", async () => {
    await registerAndLogin("Owner", `owner${D}`);
    const memberCookie = await registerAndLogin("Member", `member${D}`);

    const res = await app.request("/api/admin/users", {
      headers: { Cookie: memberCookie, Origin: ORIGIN },
    });
    expect(res.status).toBe(403);

    const events = eventsOf("forbidden");
    expect(events).toHaveLength(1);
    // 認証は通っているので、どのユーザーが権限昇格を試みたか分かる
    expect(events[0]!.role).toBe("member");
    expect(events[0]!.userId).toBeTruthy();
  });

  it("許可していないオリジンからの拒否は csrf_rejected として記録する", async () => {
    const res = await app.request("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://evil.example.com",
      },
      body: "email=a@example.com&password=Test@Password1!",
    });
    expect(res.status).toBe(403);
    // ログインパスでも、オリジン不正による拒否は login_failed ではなく CSRF として扱いたい
    expect(eventsOf("csrf_rejected")).toHaveLength(1);
  });

  it("存在しないパスへのアクセスを probe として記録する（スキャン検知）", async () => {
    await app.request("/wp-login.php", { headers: { Origin: ORIGIN } });
    expect(eventsOf("probe")).toHaveLength(1);
  });

  it("/health は監視対象から外す（ALBが数十秒ごとに叩くため）", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect(captured).toHaveLength(0);
  });
});

// --- エラー監視 ---

describe("errorHandler（app.onError）", () => {
  it("未捕捉例外を APP_ERROR として記録し、内部情報を返さない", async () => {
    const boom = new Hono();
    boom.onError(errorHandler);
    boom.get("/boom", () => {
      throw new Error("内部の秘密メッセージ");
    });

    const res = await boom.request("/boom");
    expect(res.status).toBe(500);

    // レスポンスに例外の内容やスタックトレースを漏らさない
    const body = await res.text();
    expect(body).not.toContain("内部の秘密メッセージ");
    expect(body).not.toContain("at ");

    const errors = captured.filter((e) => e.type === "APP_ERROR");
    expect(errors).toHaveLength(1);
    // 調査のために必要な情報はログ側に残す
    expect(errors[0]!.message).toBe("内部の秘密メッセージ");
    expect(errors[0]!.stack).toContain("Error");
    expect(errors[0]!.severity).toBe("error");
  });
});

describe("未捕捉例外とセキュリティイベントの関係", () => {
  // app.ts と同じ結線（securityMonitor を onError と組み合わせる）を再現する。
  // 既存の app にはテスト用の例外ルートを後から足せないため、ここで組み立てる
  const buildApp = () => {
    const a = new Hono();
    a.use("*", securityMonitor({ allowedOrigins: [ORIGIN] }));
    a.get("/boom", () => {
      throw new Error("意図的な例外");
    });
    a.onError(errorHandler);
    return a;
  };

  it("APP_ERROR と server_error の両方を、同じ requestId で記録する", async () => {
    // Hono の compose は各段で例外を捕まえて onError を呼び、その戻り値を c.res に入れてから
    // 正常に返す。そのため securityMonitor からは「500を返した正常なリクエスト」に見える。
    // 結果2行出るが、エラー監視（APP_ERROR）と5xxの頻度（server_error）は別々の観点なので
    // 意図してそのままにしている。requestId が一致するので調査時に突き合わせられる
    const res = await buildApp().request("/boom", { headers: { Origin: ORIGIN } });
    expect(res.status).toBe(500);

    const appErrors = captured.filter((e) => e.type === "APP_ERROR");
    const serverErrors = eventsOf("server_error");
    expect(appErrors).toHaveLength(1);
    expect(serverErrors).toHaveLength(1);
    expect(appErrors[0]!.requestId).toBe(serverErrors[0]!.requestId);
  });

  it("例外の起きないリクエストでは APP_ERROR を出さない", async () => {
    const res = await app.request("/api/admin/me", {
      headers: { Cookie: "token=deadbeef", Origin: ORIGIN },
    });
    expect(res.status).toBe(401);
    expect(captured.filter((e) => e.type === "APP_ERROR")).toHaveLength(0);
  });
});

describe("logAppError（リクエスト外の異常）", () => {
  it("スコープ付きで APP_ERROR を記録する", () => {
    logAppError("cleanup.test", new Error("DB接続失敗"));
    const errors = captured.filter((e) => e.type === "APP_ERROR");
    expect(errors).toHaveLength(1);
    expect(errors[0]!.scope).toBe("cleanup.test");
    expect(errors[0]!.message).toBe("DB接続失敗");
  });
});

// --- 出力形式 ---

describe("ログ形式", () => {
  it("1行につき1つの JSON オブジェクトとして出力する（メトリクスフィルタの前提）", () => {
    const lines: string[] = [];
    setMonitoringSink((line) => lines.push(line));
    logAppError("format.test", new Error("x"));

    expect(lines).toHaveLength(1);
    expect(lines[0]!).not.toContain("\n");
    expect(lines[0]!.startsWith("{")).toBe(true);
    expect(() => JSON.parse(lines[0]!)).not.toThrow();
  });
});
