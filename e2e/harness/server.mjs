// E2E 用の静的ページ配信サーバー
//
// ■ なぜ Next.js（front）を起動しないのか
// 検証したいのは Cookie の往復、つまり「ブラウザがどのオリジンから来たリクエストに
// Cookie を載せるか」であり、これはページを作ったフレームワークには一切依存しない。
// front はまだログイン画面を持たないため、実在しない UI を待つより
// 「front と同じオリジン・同じ fetch の条件」を再現できる最小のページで検証する。
// （front にログイン画面が実装されたら、画面操作を辿る spec をここに足す）
//
// 1つのサーバーを複数のホスト名で参照することで、ブラウザから見て
// 「同一サイト」と「クロスサイト」の2つのオリジンを同時に用意する。
//   同一サイト : http://localhost:3100     → API(localhost:8080) と同じサイト
//   クロスサイト: http://evil.test:3100    → API とは別サイト（攻撃者サイト相当）
// evil.test の名前解決は Chromium の --host-resolver-rules で 127.0.0.1 に向ける
// （playwright.config.ts 参照）。/etc/hosts を書き換えないのでCIでもそのまま動く。

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const port = Number(process.env.HARNESS_PORT) || 3100;
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "public");

const server = createServer(async (req, res) => {
  // ヘルスチェック用（playwright の webServer がこの応答を待って起動完了とみなす）
  if (req.url === "/__health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  try {
    const html = await readFile(join(publicDir, "index.html"));
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      // ブラウザのキャッシュで前回の内容を掴まないようにする
      "Cache-Control": "no-store",
    });
    res.end(html);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(String(e));
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`harness listening on http://localhost:${port}`);
});
