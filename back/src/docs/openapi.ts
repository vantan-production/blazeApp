// OpenAPI ドキュメントの組み立て
// ここで作った JSON を /docs/openapi.json で配信し、/docs の Scalar UI が読み込む。

import { components, type JsonSchema } from "./components.js";
import { adminPaths, invitationPaths, healthPaths } from "./paths/admin.js";
import { newsPaths, mediaPaths } from "./paths/news.js";
import { inquiryPaths } from "./paths/inquiry.js";
import { trialPaths } from "./paths/trial.js";
import { achievementPaths } from "./paths/achievement.js";
import { gameImgPaths } from "./paths/gameImg.js";

// リクエストされたオリジン（例: http://localhost:8080）を servers に埋め込んで組み立てる。
// 相対URLだと Scalar 側の結合で `//api/...` のようなパスになりうるため、絶対URLを渡す。
export const buildOpenApiDocument = (serverUrl: string): JsonSchema => ({
  openapi: "3.1.0",
  info: {
    title: "nishioblaze API",
    version: "1.0.0",
    description: [
      "西尾ブレイズ公式サイトのバックエンドAPI。",
      "",
      "## 認証",
      "",
      "`POST /api/admin/login` に成功すると `token` が HttpOnly Cookie で発行され、以降の管理者向けAPIはその Cookie で認証される。",
      "このドキュメントはAPIと同じオリジンで配信されるため、ここでログインすれば以降のリクエストにも Cookie が自動で乗る。",
      "",
      "権限は `member` < `admin` < `owner` の3段階。「admin 以上」と書かれたエンドポイントは admin / owner が実行できる。",
      "",
      "## 注意",
      "",
      "- 一覧APIは1ページ10件固定（`?page=`）。",
      "- 投稿系（画像・ファイルを伴うもの）は `multipart/form-data`、それ以外は `application/json` で送る。",
      "- 一部のエンドポイントには Redis ベースのレートリミットがある（各説明を参照）。",
    ].join("\n"),
  },
  servers: [
    { url: serverUrl, description: "このドキュメントを配信しているサーバー" },
  ],
  tags: [
    { name: "管理者・認証", description: "アカウント登録・ログイン・ロール管理" },
    { name: "ニュース", description: "ニュース投稿（news テーブル type='news'）" },
    { name: "メディア情報", description: "メディア情報（news テーブル type='media'）" },
    { name: "実績", description: "実績投稿（画像・動画・ファイル対応）" },
    { name: "問い合わせ", description: "問い合わせの受信・対応ステータス・返信" },
    { name: "体験申し込み", description: "体験申し込みの受付と管理" },
    { name: "試合風景", description: "試合風景の投稿・掲載同意・モザイク" },
    { name: "ヘルスチェック", description: "死活監視" },
  ],
  // 既定では Cookie 認証が必要。認証不要のエンドポイントは個別に security: [] を指定している
  security: [{ cookieAuth: [] }],
  components,
  paths: {
    ...healthPaths,
    ...adminPaths,
    ...invitationPaths,
    ...newsPaths,
    ...mediaPaths,
    ...achievementPaths,
    ...inquiryPaths,
    ...trialPaths,
    ...gameImgPaths,
  },
});
