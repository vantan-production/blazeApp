// APIドキュメント（Scalar UI）
// GET /docs             … ブラウザで開くAPIリファレンス（そのままリクエストを送れる）
// GET /docs/openapi.json … OpenAPI 3.1 の定義そのもの
//
// 本番では既定で無効。NODE_ENV=production のときは ENABLE_API_DOCS=true を明示した場合のみ有効になる。

import { Hono } from "hono";
import { buildOpenApiDocument } from "./openapi.js";

// ドキュメントを配信するかどうか（app.ts のマウント判定と共有）
export const isDocsEnabled =
  process.env.ENABLE_API_DOCS === "true" ||
  (process.env.ENABLE_API_DOCS !== "false" && process.env.NODE_ENV !== "production");

// Scalar の API リファレンス（UI 本体は CDN から読み込む）
//
// バージョンを固定し、SRI（integrity）を付ける。
// このページは管理者がログインした状態で開き、スクリプトは API と同一オリジンで動く。
// バージョン無指定だと常に最新版が降ってくるため、上流が差し替われば
// セッションCookieと全認証APIを持ったまま任意のコードが動いてしまう。
// 固定 + ハッシュ検証にしておけば、内容が1バイトでも変われば読み込み自体が失敗する。
//
// 更新手順（バージョンを上げるときは integrity も必ず取り直す）:
//   curl -sL "https://cdn.jsdelivr.net/npm/@scalar/api-reference@<版>/dist/browser/standalone.js" \
//     | openssl dgst -sha384 -binary | openssl base64 -A
// jsDelivr がその場で最小化する既定エントリ（@scalar/api-reference だけの URL）は
// 出力が変わりうるため SRI に使えない。必ず dist/browser/standalone.js を直接指すこと。
const SCALAR_VERSION = "1.68.0";
const SCALAR_CDN = `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}/dist/browser/standalone.js`;
const SCALAR_INTEGRITY =
  "sha384-PhSzhE9ihf7z/cKeRSKAeP+oJMMzotyFv0EjvNYgL798a2ODBQVuJLTP4Klle6IB";

const page = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>nishioblaze API リファレンス</title>
  </head>
  <body>
    <div id="app"></div>
    <script
      src="${SCALAR_CDN}"
      integrity="${SCALAR_INTEGRITY}"
      crossorigin="anonymous"
    ></script>
    <script>
      // 同一オリジンへのリクエストなので、fetch の既定（same-origin）で
      // ログイン後の HttpOnly Cookie がそのまま送信される
      Scalar.createApiReference("#app", { url: "/docs/openapi.json" });
    </script>
  </body>
</html>`;

const app = new Hono();

app.get("/docs", (c) => c.html(page));
// servers にはドキュメントを開いているオリジンをそのまま入れる（ローカルなら http://localhost:8080）
app.get("/docs/openapi.json", (c) =>
  c.json(buildOpenApiDocument(new URL(c.req.url).origin)),
);

export default app;
