# Cookie 認証の実ブラウザ E2E 設計書

対象: 西尾ブレイズ アプリ（blazeApp） / 最終更新: 2026-09-10 / 状態: **適用済み**（E2E は実装・CI組み込み済み。5章の本番構成の問題は**未対応**）

---

## 1. 背景と課題

認証は HttpOnly Cookie で行っている（`back/src/admin/login.ts`）。

```
Set-Cookie: token=<64桁>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000
```

この1行のうち、`token=<64桁>` 以外の**すべてはブラウザへの指示**である。
そして 2026-09-10 時点で、**この指示を読む相手が居るテストが1つも無かった。**

`back/src/__tests__` のテストは `app.request()` で Hono のハンドラを直接呼ぶ。
レスポンスの `Set-Cookie` から `token=xxx` を正規表現で切り出し、次のリクエストの `Cookie`
ヘッダへ手で詰め直している（`testHelpers.ts` の `extractCookie`）。

```
Set-Cookie: token=abc; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000
                 ~~~~~ ここだけを取り出す
                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ 誰も解釈しない
```

属性を守っているのはブラウザであり、テストがその役を肩代わりしてしまうと、
**属性が壊れたことを検知できない。**

### 実測した検知漏れ

実際にコードを改変して確認した結果が以下である。

| 改変 | 起きること | back の318テスト | 本E2E |
|---|---|:-:|:-:|
| `SameSite=Strict` → `None` | CSRF に無防備になる | **全て通る** | 3件が失敗 |
| `HttpOnly` を外す | XSS でトークンを盗める | 通る（`login` は文字列一致の検査すら無い） | 2件が失敗 |

`auth.test.ts` には `expect(setCookie).toContain("SameSite=Strict")` があるが、これは
**`register` のみ**で、`login` は `HttpOnly` の有無しか見ていない。
仮に全属性を文字列一致で検査したとしても「その文字列をブラウザがどう扱うか」は検証できない。

---

## 2. 用語

| 用語 | 定義 |
|---|---|
| オリジン | スキーム + ホスト + ポート。`http://localhost:3000` と `http://localhost:8080` は別オリジン |
| サイト | 登録可能ドメイン（eTLD+1）。**ポートとスキームは無関係**。`localhost:3000` と `localhost:8080` は同一サイト |
| `HttpOnly` | JavaScript から読めなくする指示。XSS でトークンを盗まれるのを防ぐ |
| `Secure` | HTTPS でのみ送信する指示。`localhost` は例外的に HTTP でも許可される |
| `SameSite=Strict` | **別サイト**のページから発したリクエストには載せない指示。CSRF を防ぐ |
| CSRF | 利用者がログイン中に攻撃者のサイトを開くと、ブラウザが自動で Cookie を載せてしまうことを悪用する攻撃 |

**「オリジン」と「サイト」の違いが本書の要点である。** `SameSite` が見るのは
オリジンではなくサイトなので、ポート番号を変えても別サイトにはならない。

---

## 3. E2E の構成

```
          Chromium（実ブラウザ）
            │              │
  http://localhost:3100    │  http://evil.test:3100   ← 同じ静的サーバーを別ホスト名で参照
  （アプリのオリジン）       │  （攻撃者サイト相当）
            └──────────────┴──→ http://localhost:8080（back の API）
                                       └──→ Postgres:5433 / Redis:6380
```

### 設計上の判断

| 判断 | 理由 |
|---|---|
| Next.js（front）を起動しない | 検証対象は Cookie の往復であり、ページを作ったフレームワークに依存しない。front にログイン画面がまだ無いため、実在しない UI を待つより `apiClient.ts` と同じ fetch 条件を再現した最小のページで検証する |
| 攻撃者サイトを `evil.test` にする | ポートを変えても同一サイト扱いになり `SameSite` の検証にならない。**別のホスト名**が要る |
| `--host-resolver-rules` で名前解決する | `/etc/hosts` を書き換えずに `evil.test` を `127.0.0.1` に向けられる。CI でもそのまま動く |
| `evil.test` も CORS で許可する | CORS で弾くと「Cookie が送られなかったのか、CORS で落ちたのか」が区別できず、`SameSite` の検証にならない |
| back を `NODE_ENV=test` で起動する | ローカル Postgres が SSL 非対応であること、レートリミットで検証が不安定になるのを避けるため。Cookie の属性は `NODE_ENV` に依存しない |
| テスト側で `Cookie` ヘッダを組み立てない | 組み立てた瞬間にこのテストは既存テストと同じものになる。送るか否かの判断は全てブラウザに委ねる |

---

## 4. 検証項目

`e2e/tests/cookie-roundtrip.spec.ts`（13件）。

| # | 検証 | 壊れた時に起きること |
|---|---|---|
| 1 | ブラウザが Cookie を受け入れ、`HttpOnly` / `Secure` / `SameSite=Strict` / `Path=/` / 有効期限どおりに保存する | 属性が不正な Cookie はブラウザが黙って捨てる。保存されていること自体が検証になる |
| 2 | `document.cookie` から読めない | XSS 一行でセッションを奪われる |
| 3 | `Cookie` ヘッダを書かずに `/api/admin/me` が 200 | そもそもログインが維持されない |
| 4 | `credentials: "omit"` だと 401 | #3 の対照実験。これが無いと「認証無しでも200を返している」可能性を排除できない |
| 5 | 再読み込み・別タブでもログイン状態が続く | ブラウザを閉じるたびログアウトになる |
| 6 | **別サイトのページからは Cookie が送られない** | CSRF に無防備 |
| 7 | アプリのオリジンに戻れば再び送られる | #6 が「ログアウトされていただけ」でないことの確認 |
| 8 | ログアウトでブラウザの保管庫から消える | 共用端末で次の人がログイン状態になる |
| 9 | パスワード誤り・偽造 Cookie では認証が通らない | — |

---

## 5. 本番構成の問題（**未対応・要判断**）

E2E を組む過程で、**本番のブラウザからはログインが成立しない構成になっている**ことが分かった。
ローカルでは `localhost` 同士なので問題が現れず、in-app テストでも現れないため、これまで見えていなかった。

### 現状の構成

| | ホスト | スキーム |
|---|---|---|
| front | Vercel（例: `nisio-blaze-dev.vercel.app`） | **HTTPS** |
| back | ALB（`*.ap-northeast-1.elb.amazonaws.com`） | **HTTP**（`infra/lib/backend-stack.ts` の `listenerPort: 80`。証明書の設定が無い） |

### 3つの問題が同時に起きる

1. **混在コンテンツのブロック** — HTTPS のページから `http://` の API を呼ぶ fetch は、
   ブラウザが送信自体を拒否する。リクエストがサーバーに届かない。
2. **`Secure` Cookie は平文 HTTP では保存されない** — 仮に1が解決しても、
   `Secure` 付きの Cookie を HTTP で受け取ったブラウザはこれを捨てる（`localhost` は例外）。
3. **`SameSite=Strict` はクロスサイトで送られない** — 仮に1と2が解決しても、
   `vercel.app` と `elb.amazonaws.com` は**別サイト**なので、
   ブラウザは Cookie を送り返さない。ログインしても即座に未ログイン扱いになる。

3番目は本E2Eの検証項目 #6 が実証しているものと**同じ現象**である。
E2E では「攻撃者サイトからは送られない」ことを確認しているが、本番では
front 自身が back から見て「別サイト」になっている。

> なお `front/lib/auth.ts` の `getCurrentUser()` は Next.js のサーバー側で
> Cookie を手動転送しているためブラウザの制約を受けない。しかしブラウザ側で Cookie が
> 保存されない以上、そこに渡す Cookie がそもそも存在しない。

### 対応案

| 案 | 内容 | 評価 |
|---|---|---|
| **A. 独自ドメインで揃える（推奨）** | `app.example.com`（front）と `api.example.com`（back）にし、ALB に ACM 証明書を付けて HTTPS 化する | 同一サイトになるので `SameSite=Strict` を維持したまま解決する。**唯一、防御を弱めずに済む案** |
| B. `SameSite=None; Secure` にする | ALB を HTTPS 化したうえで Cookie の属性を変える | 別サイトのままでも動くが、CSRF 防御を Origin 検証（`hono/csrf`）と CORS だけに頼ることになる。`hono/csrf` が検証するのはフォーム形式の content-type のみで、JSON は CORS プリフライトに依存する。**防御が一段薄くなる** |
| C. front から back へリバースプロキシする | Next.js の rewrites で `/api/*` を back に中継し、ブラウザから見て同一オリジンにする | 追加ドメイン不要。ただし全APIトラフィックが Vercel を経由するため、メディアのアップロード・ダウンロードで帯域と実行時間の制約を受ける |

**A を推奨する。** 独自ドメインの取得と ACM 証明書（無料）の設定が必要になるが、
`docs/backup-design.md` が前提とする長期運用を考えると、ALB の DNS 名を直接使う構成は
いずれ作り直しになる。

### 対応後に E2E へ足すこと

- 本番と同じ「サブドメイン違い」の構成（`app.test` / `api.test`）での往復テスト
- ALB を HTTPS 化したら、HTTP でアクセスした場合に HTTPS へリダイレクトされることの確認

---

## 6. 実装タスク

- [x] Playwright による実ブラウザ E2E（`e2e/`、13件）
- [x] CI への組み込み（`.github/workflows/ci.yml` の `e2e` ジョブ）
- [x] 改変を入れてテストが実際に落ちることの確認（1章の表）
- [ ] **5章の本番構成の問題への対応（要判断）**
- [ ] front にログイン画面が実装されたら、画面操作を辿る spec を追加する
- [ ] 対応後、サブドメイン違い構成での往復テストを追加する（5章末尾）
