// スキーマ設計

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  date,
  unique,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { z } from "zod";

// ヘルパー

// 全テーブル共通：id + created_at
const baseFields = {
  id: uuid("id").defaultRandom().primaryKey(),
  created_at: timestamp("created_at").defaultNow().notNull(),
};

// 更新日時も持つテーブル用（news・achievement）
const withUpdatedAt = {
  ...baseFields,
  updated_at: timestamp("updated_at").defaultNow().notNull(),
};

// S3パスカラム（任意、500文字以内）
const s3Path = (name: string) => varchar(name, { length: 500 });

// テーブル定義

// 管理者テーブル
export const admin = pgTable("users", {
  ...baseFields,
  // uniqueは同じトークンは存在できないようにする
  // lengthは100文字以内 notNullで空文字は不可
  name: varchar("name", { length: 100 }).notNull(),
  // uniqueは重複を不可
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  token: varchar("token", { length: 64 }).unique(),
  token_issued_at: timestamp("token_issued_at").defaultNow().notNull(),
  // 削除日時（nullなら有効、セットされていれば削除済み・30日以内なら復活可能）
  deleted_at: timestamp("deleted_at"),
  // 権限ロール: 'owner' | 'admin' | 'member'
  // 登録時のロールは invitations.role から決まる（最初の owner のみ scripts/createOwner.ts で作成）
  role: varchar("role", { length: 10 }).notNull().default("member"),
});

// ニュース / メディア情報テーブル（typeで分類）
export const news = pgTable("news", {
  ...withUpdatedAt,
  title: varchar("title", { length: 100 }).notNull(),
  body: text("body").notNull(),
  // メイン画像のS3パス（任意）
  img: s3Path("img"),
  // 'news' | 'media' | 'notice' で公開ニュース・メディア情報・関係者向け事務連絡を分ける
  type: varchar("type", { length: 10 }).notNull(),
  // 公開範囲: 'public' = 誰でも / 'member' = 関係者限定（type='notice' は常に 'member'）
  visibility: varchar("visibility", { length: 10 }).notNull().default("public"),
  // カテゴリー（自由入力・任意。固定の選択肢は持たず、投稿時に都度テキストで追加できる）
  category: varchar("category", { length: 30 }),
  // 投稿した管理者のID（アカウント削除時はNULLになる）
  admin_id: uuid("admin_id").references(() => admin.id, {
    onDelete: "set null",
  }),
});

// 関係者限定お知らせの既読管理（誰がどのお知らせを読んだか）
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

// 問い合わせテーブル
export const inquiry = pgTable("inquiry", {
  ...baseFields,
  // お客様の名前（ニックネーム可）
  name: varchar("name", { length: 100 }).notNull(),
  // お客様のメールアドレス（自動返信メールの宛先）
  // email欄を追加する前に投稿された既存データがあるためDB上はnullable。
  // APIでは必須項目としてバリデーションする（inquiry/create.ts）
  email: varchar("email", { length: 255 }),
  title: varchar("title", { length: 100 }).notNull(),
  body: text("body").notNull(),
  // 画像のS3パス（任意）
  img: s3Path("img"),
  // 対応ステータス: 'pending'（未対応・初期値）| 'in_progress'（対応中）| 'resolved'（対応済み）
  status: varchar("status", { length: 20 }).notNull().default("pending"),
});

// 問い合わせ返信テーブル
export const reply = pgTable("reply", {
  ...baseFields,
  // どの問い合わせへの返信か
  inquiry_id: uuid("inquiry_id")
    .references(() => inquiry.id, { onDelete: "cascade" })
    .notNull(),
  // 返信した管理者のID（アカウント削除時はNULLになる）
  admin_id: uuid("admin_id").references(() => admin.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 100 }).notNull(),
  body: text("body").notNull(),
  // 画像のS3パス（任意）
  img: s3Path("img"),
  // ファイルのS3パス（任意）
  file: s3Path("file"),
});

// 体験申し込みテーブル
export const trialApplication = pgTable("trial_application", {
  ...baseFields,
  email: varchar("email", { length: 255 }).notNull(),
  // 体験日
  trial_date: date("trial_date").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  // フリガナ
  furigana: varchar("furigana", { length: 100 }).notNull(),
  // 性別: 'male' | 'female' | 'other'
  gender: varchar("gender", { length: 10 }).notNull(),
  // 生年月日
  birth_date: date("birth_date").notNull(),
  school_name: varchar("school_name", { length: 100 }).notNull(),
  // 塾（任意）
  cram_school: varchar("cram_school", { length: 100 }),
  // 連絡の取れる電話番号
  phone_number: varchar("phone_number", { length: 20 }).notNull(),
  // 体験のきっかけ: 'flyer' | 'instagram' | 'referral' | 'other'
  motivation: varchar("motivation", { length: 20 }).notNull(),
  // motivation が 'other' の場合の自由記述
  motivation_other: varchar("motivation_other", { length: 200 }),
  // motivation が 'referral' の場合の紹介者名（任意）
  referrer_name: varchar("referrer_name", { length: 100 }),
});

// 実績テーブル
export const achievement = pgTable("achievement", {
  ...withUpdatedAt,
  title: varchar("title", { length: 100 }).notNull(),
  body: text("body").notNull(),
  // 画像のS3パス（任意）
  img: s3Path("img"),
  // 動画のS3パス（任意）
  movie: s3Path("movie"),
  // ファイルのS3パス（任意）
  file: s3Path("file"),
  // 投稿した管理者のID（アカウント削除時はNULLになる）
  admin_id: uuid("admin_id").references(() => admin.id, {
    onDelete: "set null",
  }),
});

// 試合風景テーブル
export const game = pgTable("game", {
  ...baseFields,
  // 画像のS3パス
  img: s3Path("img"),
  // 投稿した管理者のID（アカウント削除時はNULLになる）
  admin_id: uuid("admin_id").references(() => admin.id, {
    onDelete: "set null",
  }),
});

// 画像ストレージテーブル（複数画像対応）
export const images = pgTable("images", {
  ...baseFields,
  // 公開用のS3パス（モザイク適用後）。既存カラムの役割は変えない
  path: varchar("path", { length: 500 }).notNull(),
  // 原本のS3パス。モザイク適用時に初回のみ退避先をセットする。
  // モザイク前は null（path がそのまま原本）。
  original_path: varchar("original_path", { length: 500 }),
  // 掲載同意ステータス（試合風景画像のみ使用）
  // 'pending': 未確認（デフォルト）, 'approved': 同意済み, 'rejected': 拒否
  consent_status: varchar("consent_status", { length: 10 }).notNull().default("pending"),
  // どのコンテンツに紐づくか（各FK、使う方だけ値が入る）
  news_id: uuid("news_id").references(() => news.id, { onDelete: "cascade" }),
  inquiry_id: uuid("inquiry_id").references(() => inquiry.id, {
    onDelete: "cascade",
  }),
  reply_id: uuid("reply_id").references(() => reply.id, {
    onDelete: "cascade",
  }),
  achievement_id: uuid("achievement_id").references(() => achievement.id, {
    onDelete: "cascade",
  }),
  game_id: uuid("game_id").references(() => game.id, { onDelete: "cascade" }),
});

// 動画ストレージテーブル
export const movies = pgTable("movies", {
  ...baseFields,
  path: varchar("path", { length: 500 }).notNull(),
  achievement_id: uuid("achievement_id").references(() => achievement.id, {
    onDelete: "cascade",
  }),
});

// ファイルストレージテーブル
export const files = pgTable("files", {
  ...baseFields,
  path: varchar("path", { length: 500 }).notNull(),
  inquiry_id: uuid("inquiry_id").references(() => inquiry.id, {
    onDelete: "cascade",
  }),
  reply_id: uuid("reply_id").references(() => reply.id, {
    onDelete: "cascade",
  }),
  achievement_id: uuid("achievement_id").references(() => achievement.id, {
    onDelete: "cascade",
  }),
});

// 他者アカウント削除リクエスト（owner合意用）
export const deletionRequests = pgTable("deletion_requests", {
  ...baseFields,
  // 削除対象ユーザー
  target_user_id: uuid("target_user_id")
    .references(() => admin.id, { onDelete: "cascade" })
    .notNull(),
  // リクエストを起こしたowner
  requested_by: uuid("requested_by")
    .references(() => admin.id, { onDelete: "cascade" })
    .notNull(),
  // 24時間で失効
  expires_at: timestamp("expires_at").notNull(),
});

// 削除リクエストへの承認（各ownerが1件ずつ）
export const deletionApprovals = pgTable("deletion_approvals", {
  ...baseFields,
  request_id: uuid("request_id")
    .references(() => deletionRequests.id, { onDelete: "cascade" })
    .notNull(),
  approved_by: uuid("approved_by")
    .references(() => admin.id, { onDelete: "cascade" })
    .notNull(),
}, (t) => ({
  uniqueApproval: unique("deletion_approvals_request_approved_uniq").on(t.request_id, t.approved_by),
}));

// 掲載取り下げ依頼（member が写真の取り下げを申し出る）
// 「どの写真に誰が写っているか」の紐付けは持たず、任意の画像に対する依頼として扱う
export const consentRequests = pgTable("consent_requests", {
  ...baseFields,
  image_id: uuid("image_id")
    .references(() => images.id, { onDelete: "cascade" })
    .notNull(),
  requested_by: uuid("requested_by")
    .references(() => admin.id, { onDelete: "cascade" })
    .notNull(),
  // 依頼理由（任意）
  reason: text("reason"),
  // 'pending'（未対応・初期値）| 'accepted'（取り下げた）| 'rejected'（取り下げない）
  status: varchar("status", { length: 10 }).notNull().default("pending"),
  // 対応した管理者と対応日時
  handled_by: uuid("handled_by").references(() => admin.id, { onDelete: "set null" }),
  handled_at: timestamp("handled_at"),
});

// アンケート／出欠確認テーブル
// 出欠確認は survey_options に「出席 / 欠席 / 未定」を入れるだけで実現できる
export const surveys = pgTable("surveys", {
  ...withUpdatedAt,
  title: varchar("title", { length: 100 }).notNull(),
  body: text("body"),
  // 回答締切（任意。過ぎると回答を受け付けない）
  closes_at: timestamp("closes_at"),
  // 複数選択を許可するか
  allow_multiple: boolean("allow_multiple").notNull().default(false),
  // 作成した管理者（アカウント削除時はNULLになる）
  admin_id: uuid("admin_id").references(() => admin.id, { onDelete: "set null" }),
});

// アンケートの選択肢
export const surveyOptions = pgTable("survey_options", {
  ...baseFields,
  survey_id: uuid("survey_id")
    .references(() => surveys.id, { onDelete: "cascade" })
    .notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  // 表示順
  sort_order: integer("sort_order").notNull().default(0),
});

// アンケートへの回答（1行 = 1人が選んだ1つの選択肢）
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
  // 同じ選択肢を二重に選べないようにする。単一選択の検証はアプリ側で行う
  uniqueResponse: unique("survey_responses_survey_option_user_uniq")
    .on(t.survey_id, t.option_id, t.user_id),
}));

// パスワード再設定トークン（メールで送るのはtokenの生値、DBにはハッシュのみ保存）
export const passwordResetTokens = pgTable("password_reset_tokens", {
  ...baseFields,
  admin_id: uuid("admin_id")
    .references(() => admin.id, { onDelete: "cascade" })
    .notNull(),
  // sha256ハッシュ（hex64文字）。生トークンはDBに保存しない
  token_hash: varchar("token_hash", { length: 64 }).notNull().unique(),
  // 発行から1時間で失効
  expires_at: timestamp("expires_at").notNull(),
  // 使用済みなら日時が入る（再利用防止）
  used_at: timestamp("used_at"),
});

// 招待（メールで送るのはtokenの生値、DBにはハッシュのみ保存）
// 自己登録は廃止し、owner が発行したこの招待経由でのみアカウントを作成できる
export const invitations = pgTable("invitations", {
  ...baseFields,
  // 招待先のメールアドレス。登録時にこのアドレスと一致することを検証する
  email: varchar("email", { length: 255 }).notNull(),
  // sha256ハッシュ（hex64文字）。生トークンはDBに保存しない
  token_hash: varchar("token_hash", { length: 64 }).notNull().unique(),
  // 招待時に付与するロール: 'admin' | 'member'（owner は招待では発行しない）
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

// バリデーションスキーマ

// 文字数上限などの制約値。ここが唯一の定義元（single source of truth）。
// front側にはこの値を `npm run sync:validation` (back/scripts/exportValidationLimits.ts) で
// front/lib/validation/limits.generated.json として書き出し、front/lib/validation/schemas.ts が
// 同じ制約でzodスキーマを組み立てる。数値を変えたら必ず sync:validation を実行すること。
export const VALIDATION_LIMITS = {
  email: { max: 255 },
  // bcryptは72バイト以上を無音で切り捨てるため上限を明示
  password: { min: 8, max: 72 },
  adminName: { min: 1, max: 20 },
  title: { min: 1, max: 50 },
  body: { min: 1, max: 2000 },
  category: { min: 1, max: 30 },
  inquiryName: { min: 1, max: 16 },
  trialName: { min: 1, max: 50 },
  furigana: { min: 1, max: 100 },
  schoolName: { min: 1, max: 100 },
  cramSchool: { max: 100 },
  phoneNumber: { min: 1, max: 20 },
  motivationOther: { min: 1, max: 200 },
  referrerName: { max: 100 },
  surveyTitle: { min: 1, max: 100 },
  surveyOptionLabel: { min: 1, max: 100 },
  surveyComment: { max: 500 },
  consentReason: { max: 500 },
} as const;

export const emailSchema = z
  .string()
  .email("メールアドレス形式が正しくありません。")
  // DBのvarchar(255)に合わせた上限
  .max(VALIDATION_LIMITS.email.max, `メールアドレスは${VALIDATION_LIMITS.email.max}文字以内で入力してください。`)
  .regex(/^[\x21-\x7e]+$/, "半角英数字・記号のみ使用できます")
  .refine((val) => val.split("@").length === 2, {
    message: "@は1つだけ使用してください",
  });

export const passwordBaseSchema = z
  .string()
  .min(VALIDATION_LIMITS.password.min, `パスワードは${VALIDATION_LIMITS.password.min}文字以上で入力してください。`)
  .max(VALIDATION_LIMITS.password.max, `パスワードは${VALIDATION_LIMITS.password.max}文字以内で入力してください。`)
  .regex(/^[\x21-\x7e]+$/, "半角英数字・記号のみ使用できます。");

// 投稿系の共通バリデーション（設計書のルールに基づく）
const stringField = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label}を入力してください。`)
    .max(max, `${label}は${max}文字以内で入力してください。`);

export const adminNameSchema = stringField(
  VALIDATION_LIMITS.adminName.min,
  VALIDATION_LIMITS.adminName.max,
  "名前",
);
export const titleSchema = stringField(VALIDATION_LIMITS.title.min, VALIDATION_LIMITS.title.max, "タイトル");
export const bodySchema = stringField(VALIDATION_LIMITS.body.min, VALIDATION_LIMITS.body.max, "内容");
// カテゴリーは自由入力（固定enumなし）。頻出カテゴリーはAPI側で使用頻度から算出する
export const categorySchema = stringField(VALIDATION_LIMITS.category.min, VALIDATION_LIMITS.category.max, "カテゴリー");

// 問い合わせ用の名前バリデーション
export const inquiryNameSchema = stringField(
  VALIDATION_LIMITS.inquiryName.min,
  VALIDATION_LIMITS.inquiryName.max,
  "名前",
);

// 投稿の公開範囲
export const visibilitySchema = z.enum(["public", "member"]);

// 取り下げ依頼の対応ステータス
export const consentRequestStatusSchema = z.enum(["pending", "accepted", "rejected"]);

// 取り下げ依頼の理由（任意）
export const consentReasonSchema = z
  .string()
  .trim()
  .max(
    VALIDATION_LIMITS.consentReason.max,
    `理由は${VALIDATION_LIMITS.consentReason.max}文字以内で入力してください。`,
  )
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const consentStatusSchema = z.enum(["pending", "approved", "rejected"]);

// 招待で付与できるロール。owner は招待では発行せず、seed（scripts/createOwner.ts）か
// 既存 owner によるロール変更でのみ与えられる
export const invitationRoleSchema = z.enum(["admin", "member"]);

// 招待トークン（生値）の形式。randomBytes(32).toString("hex") と同じ64桁のhex
export const invitationTokenSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{64}$/, "招待トークンの形式が正しくありません。");

// 問い合わせの対応ステータス
export const inquiryStatusSchema = z.enum(["pending", "in_progress", "resolved"]);

export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

// 画面表示用のラベル（DBには英語キーを保存し、表示だけ日本語にする）
export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: "未対応",
  in_progress: "対応中",
  resolved: "対応済み",
};

// アンケート用バリデーション
export const surveyTitleSchema = stringField(
  VALIDATION_LIMITS.surveyTitle.min,
  VALIDATION_LIMITS.surveyTitle.max,
  "アンケートのタイトル",
);
export const surveyOptionLabelSchema = stringField(
  VALIDATION_LIMITS.surveyOptionLabel.min,
  VALIDATION_LIMITS.surveyOptionLabel.max,
  "選択肢",
);

// 体験申し込み用バリデーション

const optionalStringField = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}は${max}文字以内で入力してください。`)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const dateOnlySchema = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label}はYYYY-MM-DD形式で入力してください。`)
    .refine((v) => !Number.isNaN(Date.parse(v)), `${label}の日付が正しくありません。`);

export const trialNameSchema = stringField(
  VALIDATION_LIMITS.trialName.min,
  VALIDATION_LIMITS.trialName.max,
  "名前",
);
export const furiganaSchema = stringField(
  VALIDATION_LIMITS.furigana.min,
  VALIDATION_LIMITS.furigana.max,
  "フリガナ",
).regex(/^[ァ-ヶー\s]+$/, "フリガナは全角カタカナで入力してください。");
export const schoolNameSchema = stringField(
  VALIDATION_LIMITS.schoolName.min,
  VALIDATION_LIMITS.schoolName.max,
  "学校名",
);
export const cramSchoolSchema = optionalStringField(VALIDATION_LIMITS.cramSchool.max, "塾");
export const phoneNumberSchema = stringField(
  VALIDATION_LIMITS.phoneNumber.min,
  VALIDATION_LIMITS.phoneNumber.max,
  "電話番号",
).regex(/^0[0-9]{1,4}-?[0-9]{1,4}-?[0-9]{3,4}$/, "電話番号の形式が正しくありません。");
export const motivationOtherSchema = optionalStringField(
  VALIDATION_LIMITS.motivationOther.max,
  "体験のきっかけ（その他）",
);
export const referrerNameSchema = optionalStringField(VALIDATION_LIMITS.referrerName.max, "紹介者名");

export const genderSchema = z.enum(["male", "female", "other"]);
export const motivationSchema = z.enum(["flyer", "instagram", "referral", "other"]);

export const trialDateSchema = dateOnlySchema("体験日");
export const birthDateSchema = dateOnlySchema("生年月日");
