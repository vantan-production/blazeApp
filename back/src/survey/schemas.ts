// アンケートAPIのリクエストスキーマ（作成・更新・回答で共有する）

import { z } from "../index.js";
import {
  VALIDATION_LIMITS,
  surveyTitleSchema,
  surveyOptionLabelSchema,
  bodySchema,
} from "../shared/index.js";

// 締切は ISO 8601 の日時文字列で受け取る（null を送ると締切なしに戻せる）
const closesAtSchema = z
  .string()
  .datetime({ message: "締切はISO 8601形式の日時で指定してください。" })
  .nullable();

const optionInputSchema = z.object({
  label: surveyOptionLabelSchema,
  // 表示順。省略時は配列の並び順を使う
  sort_order: z.number().int().min(0).optional(),
});

export const createSurveySchema = z.object({
  title: surveyTitleSchema,
  body: bodySchema.optional(),
  closes_at: closesAtSchema.optional(),
  allow_multiple: z.boolean().optional(),
  // 選択肢は2つ以上（1つでは回答の意味がないため）
  options: z
    .array(optionInputSchema)
    .min(2, "選択肢は2つ以上必要です。")
    .max(20, "選択肢は20個以内で指定してください。"),
});

// 更新は送信されたフィールドのみ変更する。
// options を送ると選択肢を総入れ替えするため、既存の回答も消える点に注意（ハンドラ側で説明）
export const updateSurveySchema = z.object({
  title: surveyTitleSchema.optional(),
  body: bodySchema.nullable().optional(),
  closes_at: closesAtSchema.optional(),
  allow_multiple: z.boolean().optional(),
  options: z
    .array(optionInputSchema)
    .min(2, "選択肢は2つ以上必要です。")
    .max(20, "選択肢は20個以内で指定してください。")
    .optional(),
});

export const respondSchema = z.object({
  // 選んだ選択肢。単一選択のアンケートでは1つだけ許可する
  option_ids: z
    .array(z.string().uuid("選択肢のIDが不正です。"))
    .min(1, "選択肢を1つ以上選んでください。"),
  comment: z
    .string()
    .trim()
    .max(
      VALIDATION_LIMITS.surveyComment.max,
      `コメントは${VALIDATION_LIMITS.surveyComment.max}文字以内で入力してください。`,
    )
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

/** zod の失敗をAPI共通のエラー形式に変換する */
export const toFieldErrors = (error: z.ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
