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
const SCALAR_CDN = "https://cdn.jsdelivr.net/npm/@scalar/api-reference";

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
    <script src="${SCALAR_CDN}"></script>
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
