// 本番監視（エラー監視・不正アクセス検知）の計装
//
// ■ なぜ構造化ログ（JSON 1行）なのか
// CloudWatch Logs の「メトリクスフィルタ」は、ログが1行1JSONであれば
// `{ $.type = "SECURITY_EVENT" && $.kind = "login_failed" }` のようなパターンで
// 該当行を数え、CloudWatch メトリクスに変換できる。アラームはログではなく
// メトリクスにしか張れないため、機械が数えられる形で吐くことが監視の前提になる。
// hono/logger の `<-- POST /api/admin/login` のような人間向け1行テキストでは数えられない。
//
// ■ 個人情報の扱い
// このログは CloudWatch Logs に2週間保持される（infra/lib/backend-stack.ts）。
// メールアドレス・パスワード・生のトークンは決して載せない。
// 「同一アカウントへの総当たり」を判別する必要があるログイン試行だけは、
// メールアドレスの SHA-256 先頭12桁（actor）を載せて突き合わせ可能にする。
// IP は検知に必須なため記録するが、保持期間で自動的に消える。

import { createHash } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

// ---------------------------------------------------------------------------
// 出力先（sink）
// ---------------------------------------------------------------------------

type Sink = (line: string) => void;

// 既定は stdout。ECS の awslogs ドライバが stdout をそのまま CloudWatch Logs に送る。
// vitest 実行時（NODE_ENV=test）は既定で出力しない。監視自体を検証するテストだけが
// setMonitoringSink() で捕捉用の sink を差し込む。
const defaultSink: Sink | null =
  process.env.NODE_ENV === "test" ? null : (line) => console.log(line);

let sink: Sink | null = defaultSink;

/** テスト用。ログ行を捕捉する sink を差し込む */
export const setMonitoringSink = (next: Sink | null): void => {
  sink = next;
};

/** テスト用。既定の出力先に戻す */
export const resetMonitoringSink = (): void => {
  sink = defaultSink;
};

const emit = (payload: Record<string, unknown>): void => {
  if (!sink) return;
  try {
    sink(JSON.stringify(payload));
  } catch {
    // ログ出力の失敗でリクエスト処理を巻き込まない
  }
};

// ---------------------------------------------------------------------------
// リクエストの素性を取り出すヘルパー
// ---------------------------------------------------------------------------

/**
 * クライアントの実IPを返す。
 *
 * ALB 配下では TCP の接続元は常に ALB のノードになるため、getConnInfo() では
 * 利用者を区別できない。ALB は X-Forwarded-For の**末尾に**実IPを追記するので、
 * 「最も右の要素」を採用する。クライアントが偽の X-Forwarded-For を送ってきても
 * 左側に積まれるだけで、右端は ALB が書いた値のまま残る。
 * （プロキシが増えたらこの前提も変わるので、その時は見直すこと）
 */
export const clientIp = (c: Context): string => {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((v) => v.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
};

/** メールアドレスを突き合わせ可能な短いハッシュにする（生のアドレスはログに載せない） */
export const actorHash = (value: string): string =>
  createHash("sha256").update(value.toLowerCase()).digest("hex").slice(0, 12);

// ---------------------------------------------------------------------------
// セキュリティイベント
// ---------------------------------------------------------------------------

export type SecurityEventKind =
  | "login_succeeded"
  | "login_failed"
  | "token_invalid"
  | "forbidden"
  | "csrf_rejected"
  | "rate_limited"
  | "probe"
  | "server_error";

type Severity = "info" | "warn" | "error";

const SEVERITY: Record<SecurityEventKind, Severity> = {
  login_succeeded: "info",
  login_failed: "warn",
  token_invalid: "warn",
  forbidden: "warn",
  csrf_rejected: "warn",
  rate_limited: "warn",
  probe: "info",
  server_error: "error",
};

const LOGIN_PATH = "/api/admin/login";

/**
 * ハンドラ側から「このリクエストの主体」を補足するための置き場。
 * ログイン試行のように、認証前で c.get("user") が使えない場合に使う。
 */
export const setSecurityActor = (c: Context, actor: string): void => {
  c.set("securityActor", actorHash(actor));
};

/**
 * レスポンスのステータスとパスからイベント種別を決める。
 * 各ハンドラに計装を撒かず1箇所で判定するため、追加したAPIも自動的に監視対象になる。
 * null を返した場合はログを出さない。
 */
export const classify = (
  path: string,
  status: number,
  hasTokenCookie: boolean,
  originAllowed: boolean,
): SecurityEventKind | null => {
  if (status >= 500) return "server_error";
  if (status === 429) return "rate_limited";

  // 許可していないオリジンからの 403 は hono/csrf による拒否とみなす。
  // ログイン失敗や権限不足より先に判定する（「攻撃元サイトからの送信」という別種の信号なので、
  // 利用者のパスワード間違いと同じバケットに混ぜると検知できなくなる）
  if (status === 403 && !originAllowed) return "csrf_rejected";

  if (path === LOGIN_PATH) {
    if (status === 200) return "login_succeeded";
    // 401 = 資格情報の誤り / 403 = 削除済みアカウント。どちらも試行として数える
    if (status === 401 || status === 403) return "login_failed";
    return null;
  }

  // 権限不足（roleGuard による拒否）
  if (status === 403) return "forbidden";

  if (status === 401) {
    // Cookie を持たない 401 は「未ログインの利用者がアクセスした」だけで大量に出る。
    // 検知の価値がなくノイズになるので記録しない。Cookie を持っているのに弾かれた場合＝
    // 無効・期限切れ・改竄されたトークンなので、これは記録する。
    return hasTokenCookie ? "token_invalid" : null;
  }

  // 存在しないパスへの多量アクセスは脆弱性スキャンの兆候
  if (status === 404) return "probe";

  return null;
};

/**
 * 全リクエストの結果を見てセキュリティイベントを記録するミドルウェア。
 *
 * 各ハンドラに手を入れず、レスポンスのステータスから種別を判定する方式にしている。
 * 計装の入れ忘れが構造的に起きないこと、既存コードへの変更を最小にすることが狙い。
 */
export const securityMonitor = (options: {
  allowedOrigins: string[];
}): MiddlewareHandler => {
  const allowed = new Set(options.allowedOrigins);

  const record = (c: Context, status: number): void => {
    const origin = c.req.header("origin");
    // Origin ヘッダが無いリクエスト（同一オリジン・curl等）は CSRF 判定の対象外
    const originAllowed = origin === undefined || allowed.has(origin);
    const hasTokenCookie = Boolean(getCookie(c, "token"));

    const kind = classify(c.req.path, status, hasTokenCookie, originAllowed);
    if (!kind) return;

    const user = c.get("user") as { id?: string; role?: string } | undefined;

    emit({
      type: "SECURITY_EVENT",
      kind,
      severity: SEVERITY[kind],
      ts: new Date().toISOString(),
      requestId: c.get("requestId"),
      method: c.req.method,
      path: c.req.path,
      status,
      ip: clientIp(c),
      ua: c.req.header("user-agent")?.slice(0, 200),
      origin,
      userId: user?.id,
      role: user?.role,
      actor: c.get("securityActor"),
    });
  };

  return async (c, next) => {
    try {
      await next();
    } catch (e) {
      // 通常ここは通らない。Hono の compose は各段で例外を捕まえて app.onError を呼び、
      // その戻り値を c.res に入れてから正常に返すため、例外は上流の middleware まで伝わらない
      // （node_modules/hono/dist/compose.js 参照）。
      // これは onError が登録されていない状態で組み込まれた場合の保険で、
      // 例外側のステータスから種別を判定する。
      if (e instanceof HTTPException) record(c, e.status);
      throw e;
    }

    // 未捕捉例外の場合、ここには errorHandler が返した 500 が入っている。
    // そのため1リクエストにつき APP_ERROR と server_error の2行が出るが、
    // これは意図した挙動。前者はエラー監視、後者は5xxの発生頻度という別々の観点で数える。
    // 両者は requestId が同じなので調査時に突き合わせられる。
    record(c, c.res.status);
  };
};

// ---------------------------------------------------------------------------
// エラー監視
// ---------------------------------------------------------------------------

/**
 * 未捕捉の例外を記録して、内部情報を含まない 500 を返す。
 *
 * app.onError を置かない場合、Hono は例外の内容をそのままレスポンスに出しうるうえ、
 * 発生自体がどこにも通知されない。ここで APP_ERROR として記録することで、
 * CloudWatch のメトリクスフィルタが 1件でもアラームを上げられるようになる。
 */
export const errorHandler = (err: Error, c: Context): Response => {
  // HTTPException は「アプリが意図して投げた応答」（hono/csrf の403など）。
  // バグではないので APP_ERROR として記録せず、本来返すはずだった応答をそのまま返す。
  // ここで 500 に塗り潰すと、CSRF拒否が「サーバー障害」として誤検知される。
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  emit({
    type: "APP_ERROR",
    severity: "error",
    ts: new Date().toISOString(),
    requestId: c.get("requestId"),
    method: c.req.method,
    path: c.req.path,
    ip: clientIp(c),
    name: err.name,
    message: err.message,
    stack: err.stack?.slice(0, 4000),
  });

  return c.json(
    { success: false, errors: "サーバー内部でエラーが発生しました。" },
    500,
  );
};

/** 起動直後など、リクエスト外で起きた異常を記録する（DB接続失敗など） */
export const logAppError = (
  scope: string,
  err: unknown,
  extra: Record<string, unknown> = {},
): void => {
  emit({
    type: "APP_ERROR",
    severity: "error",
    ts: new Date().toISOString(),
    scope,
    name: err instanceof Error ? err.name : typeof err,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack?.slice(0, 4000) : undefined,
    ...extra,
  });
};
