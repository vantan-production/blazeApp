# e2e — 実ブラウザによる Cookie 往復テスト

実際の Chromium を起動し、HttpOnly Cookie によるセッションがブラウザ上で正しく往復することを検証する。

## なぜ back のテストと別に必要なのか

`back/src/__tests__` のテストは `app.request()` で Hono のハンドラを直接呼ぶ。
このときレスポンスの `Set-Cookie` から `token=xxx` の部分を正規表現で切り出し、次のリクエストの
`Cookie` ヘッダへ手で詰め直している（`back/src/__tests__/testHelpers.ts` の `extractCookie`）。

```
Set-Cookie: token=abc; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000
                 ~~~~~ ここだけを取り出して Cookie: token=abc として送る
                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ この部分は誰も解釈していない
```

つまり Cookie の**属性が全て無視されている**。属性はブラウザへの指示であり、
指示を読む相手が居なければ守られているかどうかを確かめられない。実際に次の改変を入れても
back の318テストは全て通る（`SameSite` は `register` のみ文字列一致で検査されており、
`login` は `HttpOnly` の有無しか見ていない）。

| 改変 | 起きること | back のテスト | このE2E |
|---|---|:-:|:-:|
| `HttpOnly` を外す | XSS でトークンを盗める | ✗ 検知（文字列一致のみ） | ✓ 検知 |
| `SameSite=Strict` → `None` | CSRF に無防備になる | **通ってしまう** | ✓ 検知 |
| `Path=/` → `Path=/api` | ログアウトで Cookie が消えない | **通ってしまう** | ✓ 検知 |
| `Max-Age` を外す | ブラウザを閉じるとログアウト | **通ってしまう** | ✓ 検知 |

上の表は実測値である（`SameSite` と `HttpOnly` については実際に改変して確認した）。

## 検証していること

1. **ブラウザが Cookie を受け入れる** — 属性が不正な Cookie はブラウザが黙って捨てるため、
   保管庫に入っていること自体が検証になる
2. **`HttpOnly` が実効である** — `document.cookie` から読めないことを、XSS と同じ操作で確認する
3. **ブラウザが自動で送り返す** — `Cookie` ヘッダを一切書かずに `/api/admin/me` が 200 になる
4. **`credentials: "omit"` なら 401** — 上の 200 が本当に Cookie のおかげであることの対照実験
5. **クロスサイトからは送られない** — 別サイトのページから叩くと 401（`SameSite=Strict` の実効性）
6. **ログアウトで消える** — 削除用 `Set-Cookie` の属性が発行時と一致していることの確認

## 構成

```
          Chromium（実ブラウザ）
            │          │
  http://localhost:3100 │ http://evil.test:3100   ← 同じ静的サーバーを別ホスト名で参照
  （アプリのオリジン）    │ （攻撃者サイト相当）
            └──────────┴──→ http://localhost:8080（back の API）
                                    └──→ Postgres:5433 / Redis:6380（Docker）
```

- `localhost` と `evil.test` は**ブラウザから見て別サイト**なので `SameSite` の判定が働く。
  ポートが違っても同一サイト扱いになるため、ポートを変えるだけでは検証できない
- `evil.test` は Chromium の `--host-resolver-rules` で `127.0.0.1` に向ける。
  `/etc/hosts` を書き換えないので CI でもそのまま動く
- back は `NODE_ENV=test` で起動する。ローカル Postgres が SSL 非対応であること、
  レートリミットに当たって検証が不安定になるのを避けるため。Cookie の属性は `NODE_ENV` に依存しない

## 実行方法

```bash
# 1. Postgres / Redis を起動（back のテスト用コンテナを共用する）
npm run db:up

# 2. 初回のみ Chromium を取得
npx playwright install chromium

# 3. 実行（back の API と静的サーバーは playwright が自動で起動・停止する）
npm test
```

ブラウザの動きを目で見たい場合は `npm run test:headed`。失敗時は `npm run report` でレポートを開く。

CI では `.github/workflows/ci.yml` の `e2e` ジョブとして毎 PR で実行される。

## 前提データ

`tests/seed.setup.ts` が `users` テーブルを空にしてから `back` の `npm run create:owner` を実行し、
owner を1人作る。本番と同じ作成経路を通すため、テスト専用の作成処理は持たない。

## 既知の制約

- **front の画面操作は辿っていない。** front にはまだログイン画面が無いため、
  `front/lib/apiClient.ts` と同じ fetch の条件（`credentials: "include"`）を再現した
  静的ページから API を叩いている。ログイン画面が実装されたら、画面操作を辿る spec を足すこと
- **本番と同じ「別サイト構成」では現状ログインが成立しない。** 詳細と対応案は
  `docs/cookie-e2e-design.md` の「本番構成の問題」を参照
