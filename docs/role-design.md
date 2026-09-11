# ロール仕様 設計書

対象: 西尾ブレイズ アプリ / 最終更新: 2026-09-04

---

## 1. 背景と課題

現在ロールは `owner` / `admin` / `member` の3つ。しかし `member` には権限が1つも割り当てられておらず、**ログインしても未ログインの一般ユーザーと出来ることが変わらない**状態になっている。

そこで `member` を「西尾ブレイズ関係者」向けのロールとして再定義し、**ログインしないと見られない／できない関係者エリア**を新設することで存在意義を与える。

### 用語

| 呼称 | 定義 | アカウント |
|---|---|---|
| 一般ユーザー | 公開ホームページの閲覧者 | **持たない**（匿名） |
| member | 西尾ブレイズ関係者（選手・保護者・スタッフ等） | 持つ（招待制で配布） |
| admin | 投稿担当者 | 持つ（招待制で配布） |
| owner | アプリの最高管理者 | 持つ（初回のみ特別手順） |

---

## 2. ロール定義

| ロール | 役割 |
|---|---|
| `owner` | 最高管理者。ユーザー管理・ロール変更・招待発行を含む全操作が可能 |
| `admin` | 投稿担当。ニュース・実績・試合風景の投稿と問い合わせ対応。ユーザー管理は不可 |
| `member` | 西尾ブレイズ関係者。関係者エリアの閲覧・アンケート回答・原本写真の取得が可能。投稿・管理は不可 |

権限は上位互換とする（owner ⊃ admin ⊃ member）。

---

## 3. 権限表

| 機能 | owner | admin | member | 一般 |
|---|:-:|:-:|:-:|:-:|
| **公開エリア** |
| 公開ページ閲覧（ニュース・実績・試合風景） | ○ | ○ | ○ | ○ |
| 問い合わせ送信 | ○ | ○ | ○ | ○ |
| **管理エリア** |
| ニュース／メディア／実績／試合風景の投稿・編集・削除 | ○ | ○ | × | × |
| 問い合わせ閲覧・返信 | ○ | ○ | × | × |
| 掲載同意ステータス変更・モザイク適用 | ○ | ○ | × | × |
| ユーザー一覧・ロール変更 | ○ | × | × | × |
| アカウント削除リクエスト／承認 | ○ | × | × | × |
| 招待の発行・失効 | ○ | × | × | × |
| **関係者エリア（新設）** |
| A. 関係者限定お知らせ 閲覧 | ○ | ○ | ○ | × |
| A. 関係者限定お知らせ 投稿・既読状況の確認 | ○ | ○ | × | × |
| B. アンケート／出欠 回答 | ○ | ○ | ○ | × |
| B. アンケート 作成・集計・未回答者確認 | ○ | ○ | × | × |
| C. 試合風景 原本（モザイクなし）閲覧・ダウンロード | ○ | ○ | ○ | × |
| D. 掲載取り下げ依頼の送信 | ○ | ○ | ○ | × |
| D. 取り下げ依頼の対応 | ○ | ○ | × | × |
| E. 資料庫 閲覧・ダウンロード | ○ | ○ | ○ | × |
| E. 資料庫 アップロード・削除 | ○ | ○ | × | × |
| F. 投稿申請の作成 | ○ | ○ | ○ | × |
| F. 投稿申請の承認・公開 | ○ | ○ | × | × |
| G. 通知の受信 | ○ | ○ | ○ | × |

---

## 4. URL / 画面設計

同一ドメイン・パスで分離する。**公開ホームページからログイン画面への導線は一切設置しない。**

```
公開エリア（認証不要）
  /                 トップ
  /news             ニュース一覧・詳細
  /media            メディア情報
  /achievement      実績
  /gallery          試合風景（consent_status = approved かつモザイク適用済みのみ）
  /inquiry          問い合わせフォーム

/login              ログイン（HPからリンクなし・noindex）
/register?token=xxx 招待トークン経由の登録のみ

関係者エリア（owner / admin / member）
  /members                  ダッシュボード
  /members/notices          A. 関係者限定お知らせ
  /members/surveys          B. アンケート・出欠
  /members/gallery          C. 試合風景 原本
  /members/documents        E. 資料庫
  /members/submissions      F. 投稿申請

管理エリア（owner / admin）
  /dashboard                ダッシュボード
  /dashboard/news           ニュース・メディア管理
  /dashboard/achievement    実績管理
  /dashboard/gallery        試合風景管理（同意・モザイク）
  /dashboard/inquiry        問い合わせ対応
  /dashboard/notices        A. 限定お知らせ管理・既読状況
  /dashboard/surveys        B. アンケート作成・集計
  /dashboard/consent        D. 取り下げ依頼対応
  /dashboard/submissions    F. 投稿申請の承認
  /dashboard/users          ユーザー管理（owner のみ）
  /dashboard/invitations    招待管理（owner のみ）
```

ログイン成功後は role で振り分ける。`member` → `/members`、`admin` / `owner` → `/dashboard`。

### セキュリティ上の注意

「URLを知っている人だけがアクセスできる」は**認証ではない**。ビルド成果物や外部リンク経由で露出しうるため、以下を併用する。

- 認証の本体はログイン + 招待制（Phase 0）
- `/login`・`/members`・`/dashboard` は `robots.txt` で noindex
- 導線を置かないのは「一般ユーザーが誤って迷い込まない」ための補助策と位置づける

---

## 5. 現状の実装と課題（コード調査結果）

### 5-1. 誰でもアカウントを作成できる

`back/src/admin/register.ts` の `POST /api/admin/register` は招待も承認もなく、メール・パスワードを送れば誰でも登録できる。制限は「1分に1回」のレート制限のみ。

```ts
// register.ts:138
const role = Number(countResult[0]?.total ?? 0) === 0 ? "owner" : "member";
```

初回登録者のみ `owner`、2人目以降は全員 `member` になる。

現状 `member` には権限が無いため実害は無いが、**A〜G を実装した瞬間、この自己登録が「関係者エリアへの誰でも入場口」になる。よって Phase 0（招待制）は A〜G すべての前提条件。**

### 5-2. モザイクが原本を上書きしている ★重要

`back/src/gameImg/applyMosaic.ts` は加工結果を**同じ S3 キーに上書き**している。

```ts
// S3 に上書きアップロード（元画像を完全に置き換え）
await uploadToS3(result, s3Key, "image/webp");
```

つまり **モザイク適用後、原本は完全に失われる**。

影響:

1. **案C「member は原本を閲覧・ダウンロードできる」が現状の実装では成立しない**
2. モザイクのやり直し・取り消しができない（座標を間違えても戻せない）

対応: `images` に `original_path` を追加し、モザイク適用時に**初回のみ**原本を別キーへ退避する。詳細は Phase 3 を参照。

### 5-3. フロントエンドは未着手

`front/app/` には `layout.tsx` / `page.tsx`（Next.js テンプレのまま）/ `globals.css` のみで、公開ページも管理ページも未実装。よって **URL 設計は白紙の状態から自由に決められる。**

なお `front/lib/auth.ts` には `getCurrentUser()` / `requireAuth()` が実装済みで、未ログイン時に `/login` へリダイレクトする前提のコードは既にある。

### 5-4. 既存の権限ガード

`back/src/db/roleGuard.ts` に以下の2つがある。関係者エリア用に `requireMember` を追加する。

```ts
export const requireOwner = requireRole("owner");
export const requireAdmin = requireRole("owner", "admin");
```

---

## 6. Phase 0: 招待制 ★全機能の前提

### 方針

自己登録を廃止し、**owner が発行した招待トークン経由でのみ**アカウントを作成できるようにする。

### なぜ認証コード（共有の合言葉）ではなく招待制か

| | 共有認証コード | 招待トークン |
|---|---|---|
| 漏洩時の影響 | 1つ漏れたら全滅。変更すると全員に再周知が必要 | 該当の1通を失効させるだけ |
| 誰が使ったかの追跡 | 不可 | メールアドレス単位で可能 |
| 有効期限 | 実質なし | 設定可能 |
| ロールの出し分け | 不可 | 招待時に member / admin を指定できる |
| 実装コスト | 軽い | `password_reset_tokens` とほぼ同設計のため大差なし |

パスワード再設定でトークン発行 + メール送信の仕組みが既に動いているため、招待制の追加コストは小さい。

### スキーマ

```ts
// 招待（メールで送るのは生トークン、DBにはハッシュのみ保存）
export const invitations = pgTable("invitations", {
  ...baseFields,
  email: varchar("email", { length: 255 }).notNull(),
  // sha256ハッシュ（hex64文字）
  token_hash: varchar("token_hash", { length: 64 }).notNull().unique(),
  // 招待時に付与するロール（owner は招待では発行しない）
  role: varchar("role", { length: 10 }).notNull(),
  // 発行した owner
  invited_by: uuid("invited_by")
    .references(() => admin.id, { onDelete: "cascade" })
    .notNull(),
  // 発行から7日で失効
  expires_at: timestamp("expires_at").notNull(),
  // 使用済みなら日時が入る（再利用防止）
  used_at: timestamp("used_at"),
});
```

### API

| メソッド | パス | 権限 | 内容 |
|---|---|:-:|---|
| POST | `/api/admin/invitations` | owner | 招待発行（email + role を指定）＋招待メール送信 |
| GET | `/api/admin/invitations` | owner | 招待一覧（未使用／使用済み／失効） |
| DELETE | `/api/admin/invitations/:id` | owner | 招待の失効 |
| GET | `/api/admin/invitations/verify?token=` | 不要 | トークンの有効性確認（登録画面の表示判定用） |
| POST | `/api/admin/register` | 不要 | **要変更**: `token` を必須パラメータに追加 |

### `register.ts` の変更点

1. リクエストに `token` を必須で追加
2. `invitations` を `token_hash` で検索し、`used_at IS NULL` かつ `expires_at > NOW()` を確認
3. リクエストの `email` が招待の `email` と一致することを確認
4. role は `invitations.role` から決定する（**現行の「初回登録者を owner」ロジックは削除**）
5. 登録成功時に `invitations.used_at` をセット

### 初回 owner の作成方法

招待制にすると「最初の owner を誰が招待するのか」という問題が発生する。以下のいずれかで対応する（要決定）。

- **案1（推奨）**: seed スクリプト `back/scripts/createOwner.ts` を用意し、デプロイ時に手動実行
- **案2**: 環境変数 `ALLOW_INITIAL_OWNER=true` のときのみ、ユーザー0件時に自己登録を許可

### 既存アカウントの扱い

自己登録で既に作成されたアカウントが残っている場合、Phase 0 適用時に洗い出して owner が精査する（不要なものは削除）。

### クリーンアップ

`app.ts` の `cleanupExpiredAccounts()` に、期限切れ招待の削除を追加する。

```sql
DELETE FROM invitations WHERE expires_at < NOW() AND used_at IS NULL;
```

---

## 7. Phase 1: 関係者エリアの土台 + A. 関係者限定お知らせ

### 権限ガードの追加

```ts
// roleGuard.ts
export const requireMember = requireRole("owner", "admin", "member");
```

### スキーマ

既存の `news` テーブルを拡張して流用する（新テーブル不要）。

```ts
export const news = pgTable("news", {
  ...withUpdatedAt,
  // ...既存カラム
  // 公開範囲: 'public' = 誰でも / 'member' = 関係者限定
  visibility: varchar("visibility", { length: 10 }).notNull().default("public"),
});

// 既読管理
export const newsReads = pgTable("news_reads", {
  ...baseFields,
  news_id: uuid("news_id")
    .references(() => news.id, { onDelete: "cascade" })
    .notNull(),
  user_id: uuid("user_id")
    .references(() => admin.id, { onDelete: "cascade" })
    .notNull(),
  read_at: timestamp("read_at").defaultNow().notNull(),
}, (t) => ({
  uniqueRead: unique("news_reads_news_user_uniq").on(t.news_id, t.user_id),
}));
```

`type` は既存の `'news' | 'media'` に加えて `'notice'`（事務連絡）を追加する。

### 既存APIへの影響 ★注意

`news/getAll.ts` / `getById.ts` は現在すべての記事を返している。**`visibility = 'member'` の記事が公開APIから漏れないよう、認証状態に応じたフィルタが必須。** `gameImg/visibleImages.ts` の `isAdmin` 分岐と同じ考え方で、`getOptionalUser()` を使って実装する。

### API

| メソッド | パス | 権限 | 内容 |
|---|---|:-:|---|
| GET | `/api/news` | 不要 | **要変更**: 未ログインは `visibility='public'` のみ返す |
| GET | `/api/notices` | member | 関係者限定お知らせ一覧（自分の既読フラグ付き） |
| GET | `/api/notices/:id` | member | 詳細 |
| POST | `/api/notices/:id/read` | member | 既読をつける |
| GET | `/api/notices/:id/reads` | admin | 既読状況（既読者・未読者の一覧） |

投稿・編集・削除は既存の `crudRouter` に `visibility` を通すだけで対応できる。

### 価値

**既読管理が最大の差別化ポイント。** LINE グループの事務連絡は誰が読んだか追えないが、ここでは未読者を名指しで把握できる。

---

## 8. Phase 2: B. アンケート／出欠確認

### 方針

汎用アンケートより先に**試合・練習の出欠確認**を作る。スポーツチームで最も使用頻度が高く、効果を実感しやすい。選択肢を自由に定義できる形にすれば、出欠も汎用アンケートも同じ仕組みで賄える。

### スキーマ

```ts
export const surveys = pgTable("surveys", {
  ...withUpdatedAt,
  title: varchar("title", { length: 100 }).notNull(),
  body: text("body"),
  // 回答締切
  closes_at: timestamp("closes_at"),
  // 複数選択を許可するか
  allow_multiple: boolean("allow_multiple").notNull().default(false),
  // 作成した管理者
  admin_id: uuid("admin_id").references(() => admin.id, { onDelete: "set null" }),
});

export const surveyOptions = pgTable("survey_options", {
  ...baseFields,
  survey_id: uuid("survey_id")
    .references(() => surveys.id, { onDelete: "cascade" })
    .notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  // 表示順
  sort_order: integer("sort_order").notNull().default(0),
});

export const surveyResponses = pgTable("survey_responses", {
  ...baseFields,
  survey_id: uuid("survey_id")
    .references(() => surveys.id, { onDelete: "cascade" })
    .notNull(),
  option_id: uuid("option_id")
    .references(() => surveyOptions.id, { onDelete: "cascade" })
    .notNull(),
  user_id: uuid("user_id")
    .references(() => admin.id, { onDelete: "cascade" })
    .notNull(),
  // 自由記述（任意）
  comment: text("comment"),
}, (t) => ({
  // 単一選択の場合の重複防止はアプリ側でも検証する
  uniqueResponse: unique("survey_responses_survey_option_user_uniq")
    .on(t.survey_id, t.option_id, t.user_id),
}));
```

出欠確認は `survey_options` に「出席 / 欠席 / 未定」を入れるだけで実現できる。

### API

| メソッド | パス | 権限 | 内容 |
|---|---|:-:|---|
| GET | `/api/surveys` | member | 一覧（自分の回答状況付き） |
| GET | `/api/surveys/:id` | member | 詳細 |
| POST | `/api/surveys/:id/responses` | member | 回答（締切後は 400） |
| POST | `/api/surveys` | admin | 作成 |
| PATCH | `/api/surveys/:id` | admin | 編集 |
| DELETE | `/api/surveys/:id` | admin | 削除 |
| GET | `/api/surveys/:id/results` | admin | 集計結果 |
| GET | `/api/surveys/:id/pending` | admin | **未回答者一覧** |

### 価値

「未回答者一覧」が運用上もっとも効く。誰に催促すればよいかが一目で分かる。

---

## 9. Phase 3: C. 原本閲覧・DL / D. 掲載取り下げ依頼

### C. 試合風景 原本の関係者限定閲覧

| | 一般ユーザー | member 以上 |
|---|---|---|
| 表示対象 | `consent_status = 'approved'` のみ | 全件 |
| 画像 | モザイク適用済み | **原本（モザイクなし）** |
| ダウンロード | 不可 | 可 |

#### 前提となる修正（5-2 参照）

現状 `applyMosaic.ts` が原本を上書きしているため、**まず原本を保全する改修が必要**。

```ts
export const images = pgTable("images", {
  ...baseFields,
  // 公開用パス（モザイク適用後）。既存カラムの役割は変えない
  path: varchar("path", { length: 500 }).notNull(),
  // 原本パス。モザイク適用時に初回のみ退避先をセットする
  original_path: varchar("original_path", { length: 500 }),
  // ...既存カラム
});
```

`applyMosaic.ts` の変更:

1. 適用前に `original_path` が未設定なら、原本を `originals/` 配下の別キーにコピーして `original_path` に記録する
2. 加工結果はこれまで通り `path` に上書きする
3. これによりモザイクの**やり直し・取り消し**も可能になる（副次的な改善）

`visibleImages.ts` の変更:

- 引数を `isAdmin: boolean` から `viewerRole: Role | null` に変更
- `member` 以上なら `original_path ?? path` の presigned URL を返す
- 未ログインは従来通り `approved` のみ、かつ `path`（モザイク版）を返す

#### API

| メソッド | パス | 権限 | 内容 |
|---|---|:-:|---|
| GET | `/api/members/gallery` | member | 原本一覧 |
| GET | `/api/members/gallery/:imageId/download` | member | 原本のダウンロードURL発行 |

### D. 掲載取り下げ依頼

「どの写真に誰が写っているか」の紐付けは実装が重いため、**member が任意の画像に対して取り下げを依頼できるフォーム**という軽量な形にする。

```ts
export const consentRequests = pgTable("consent_requests", {
  ...baseFields,
  image_id: uuid("image_id")
    .references(() => images.id, { onDelete: "cascade" })
    .notNull(),
  requested_by: uuid("requested_by")
    .references(() => admin.id, { onDelete: "cascade" })
    .notNull(),
  // 依頼理由
  reason: text("reason"),
  // 'pending' | 'accepted' | 'rejected'
  status: varchar("status", { length: 10 }).notNull().default("pending"),
  // 対応した管理者と対応日時
  handled_by: uuid("handled_by").references(() => admin.id, { onDelete: "set null" }),
  handled_at: timestamp("handled_at"),
});
```

| メソッド | パス | 権限 | 内容 |
|---|---|:-:|---|
| POST | `/api/consent-requests` | member | 取り下げ依頼を送信 |
| GET | `/api/consent-requests` | admin | 依頼一覧 |
| PATCH | `/api/consent-requests/:id` | admin | 対応（承認時は該当画像を `rejected` に更新） |

---

## 10. Phase 4: E. 資料庫 / F. 投稿申請 / G. 通知

### E. 関係者限定 資料庫

規約・年間スケジュール・練習メニュー等の PDF を配布する。既存の `files` テーブルと S3 の仕組みを流用する。

```ts
export const documents = pgTable("documents", {
  ...withUpdatedAt,
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  // 分類（自由入力）
  category: varchar("category", { length: 30 }),
  admin_id: uuid("admin_id").references(() => admin.id, { onDelete: "set null" }),
});
```

`files` テーブルに `document_id` の FK を追加する。

| メソッド | パス | 権限 |
|---|---|:-:|
| GET | `/api/documents` | member |
| GET | `/api/documents/:id/download` | member |
| POST / PATCH / DELETE | `/api/documents` | admin |

### F. member からの投稿申請

member が試合写真や記事を下書き投稿し、admin が承認して公開する。

`news` / `game` に `status` を追加する。

```ts
// 'draft' | 'pending' | 'published'
status: varchar("status", { length: 10 }).notNull().default("published"),
```

- member が作成すると `status = 'pending'`
- 公開APIは `status = 'published'` のみを返す（Phase 1 の `visibility` フィルタと同じ箇所で処理する）
- admin が承認すると `published` になる

| メソッド | パス | 権限 | 内容 |
|---|---|:-:|---|
| POST | `/api/submissions` | member | 投稿申請 |
| GET | `/api/submissions` | member | 自分の申請一覧 |
| GET | `/api/submissions/pending` | admin | 承認待ち一覧 |
| PATCH | `/api/submissions/:id/approve` | admin | 承認して公開 |
| PATCH | `/api/submissions/:id/reject` | admin | 差し戻し |

### G. メール通知

新しい関係者限定お知らせ・アンケートの公開時に member へメール通知する。パスワード再設定のメール基盤をそのまま流用できる。

```ts
// 通知設定（ユーザーごとのオプトアウト用）
export const notificationSettings = pgTable("notification_settings", {
  ...baseFields,
  user_id: uuid("user_id")
    .references(() => admin.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  notice_email: boolean("notice_email").notNull().default(true),
  survey_email: boolean("survey_email").notNull().default(true),
});
```

送信は同期処理にせず、失敗しても投稿自体は成功させる（ログに残して後追い）。

---

## 11. スキーマ変更まとめ

### 新規テーブル

| テーブル | Phase | 用途 |
|---|:-:|---|
| `invitations` | 0 | 招待トークン |
| `news_reads` | 1 | 既読管理 |
| `surveys` | 2 | アンケート |
| `survey_options` | 2 | 選択肢 |
| `survey_responses` | 2 | 回答 |
| `consent_requests` | 3 | 掲載取り下げ依頼 |
| `documents` | 4 | 資料庫 |
| `notification_settings` | 4 | 通知設定 |

### 既存テーブルへのカラム追加

| テーブル | カラム | Phase | 備考 |
|---|---|:-:|---|
| `news` | `visibility` | 1 | `'public'` / `'member'` |
| `news` | `status` | 4 | `'draft'` / `'pending'` / `'published'` |
| `images` | `original_path` | 3 | **原本保全。5-2 の問題への対応** |
| `game` | `status` | 4 | 投稿申請用 |
| `files` | `document_id` | 4 | 資料庫用 FK |

### バリデーション

`VALIDATION_LIMITS` に以下を追加し、`npm run sync:validation` でフロントへ書き出す。

- `surveyTitle` / `surveyOptionLabel` / `noticeTitle` / `documentTitle` / `consentReason`

---

## 12. クライアント確認事項

1. **member は誰に配布するか**（選手本人 / 保護者 / スタッフ / スポンサー）
   - 保護者を含めるなら案C（原本写真）の価値が大きく上がる
2. **想定人数**（10人規模か100人規模か）
   - 既読管理・未回答者一覧の UI 設計が変わる
3. **現在、事務連絡と出欠確認を何で運用しているか**（LINE / 紙 / メール）
   - 現状の不満点がそのまま優先実装すべき機能になる
4. **写真原本の配布を許容するか**（肖像権の扱い）
   - ダウンロード可否、透かしの要否
5. **admin は誰が担当するか**（何人程度か）
6. **通知手段はメールでよいか**（LINE 連携の要望がないか）

---

## 13. 実装順序まとめ

| Phase | 内容 | 依存 |
|:-:|---|---|
| 0 | 招待制 | なし。**全機能の前提** |
| 1 | 関係者エリア土台 + A. 限定お知らせ・既読管理 | Phase 0 |
| 2 | B. アンケート・出欠確認 | Phase 1 |
| 3 | C. 原本閲覧・DL（原本保全の改修含む） + D. 取り下げ依頼 | Phase 1 |
| 4 | E. 資料庫 / F. 投稿申請 / G. 通知 | Phase 1 |

Phase 2 / 3 / 4 は Phase 1 完了後であれば並行して進められる。
