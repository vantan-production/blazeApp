// back/src/db/schema.ts のzodスキーマと同じ制約値(VALIDATION_LIMITS)を使ってfront用のzodスキーマを組み立てる。
// 「同じ制約をfrontのフォームにも入れたい」場合は、ここに無ければ追加し、
// 独自にz.string().max(...)などを画面ごとに書かないこと。
// 制約値そのものを変えたい場合はback側(VALIDATION_LIMITS)を直し、npm run sync:validationで反映する。

import { z } from "zod";
import { VALIDATION_LIMITS } from "./limits";

const stringField = (min: number, max: number, label: string) =>
	z
		.string()
		.trim()
		.min(min, `${label}を入力してください。`)
		.max(max, `${label}は${max}文字以内で入力してください。`);

export const emailSchema = z
	.string()
	.email("メールアドレス形式が正しくありません。")
	.max(
		VALIDATION_LIMITS.email.max,
		`メールアドレスは${VALIDATION_LIMITS.email.max}文字以内で入力してください。`,
	);

export const passwordSchema = z
	.string()
	.min(
		VALIDATION_LIMITS.password.min,
		`パスワードは${VALIDATION_LIMITS.password.min}文字以上で入力してください。`,
	)
	.max(
		VALIDATION_LIMITS.password.max,
		`パスワードは${VALIDATION_LIMITS.password.max}文字以内で入力してください。`,
	);

export const adminNameSchema = stringField(
	VALIDATION_LIMITS.adminName.min,
	VALIDATION_LIMITS.adminName.max,
	"名前",
);

export const titleSchema = stringField(
	VALIDATION_LIMITS.title.min,
	VALIDATION_LIMITS.title.max,
	"タイトル",
);

export const bodySchema = stringField(
	VALIDATION_LIMITS.body.min,
	VALIDATION_LIMITS.body.max,
	"内容",
);

export const categorySchema = stringField(
	VALIDATION_LIMITS.category.min,
	VALIDATION_LIMITS.category.max,
	"カテゴリー",
);

export const inquiryNameSchema = stringField(
	VALIDATION_LIMITS.inquiryName.min,
	VALIDATION_LIMITS.inquiryName.max,
	"名前",
);

// 問い合わせの対応ステータス（back/src/db/schema.ts と同じ値・同じラベル）
export const inquiryStatusSchema = z.enum([
	"pending",
	"in_progress",
	"resolved",
]);

export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;

// 画面表示用のラベル（DBには英語キーが入る）
export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
	pending: "未対応",
	in_progress: "対応中",
	resolved: "対応済み",
};

// ---- 体験申し込み（back/src/db/schema.ts の「体験申し込み用バリデーション」と同じ制約） ----
// 文字数は VALIDATION_LIMITS から取るが、正規表現・選択肢は limits.generated.json に含まれないため
// back と同じ値をここに書いている。back 側を変えたらこちらも合わせること。

// 任意項目。空欄は undefined として扱う（back の optionalStringField と同じ）
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
		.regex(/^\d{4}-\d{2}-\d{2}$/, `${label}を入力してください。`)
		.refine(
			(v) => !Number.isNaN(Date.parse(v)),
			`${label}の日付が正しくありません。`,
		);

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

export const cramSchoolSchema = optionalStringField(
	VALIDATION_LIMITS.cramSchool.max,
	"塾",
);

export const phoneNumberSchema = stringField(
	VALIDATION_LIMITS.phoneNumber.min,
	VALIDATION_LIMITS.phoneNumber.max,
	"電話番号",
).regex(
	/^0[0-9]{1,4}-?[0-9]{1,4}-?[0-9]{3,4}$/,
	"電話番号の形式が正しくありません。",
);

export const motivationOtherSchema = optionalStringField(
	VALIDATION_LIMITS.motivationOther.max,
	"体験のきっかけ（その他）",
);

export const referrerNameSchema = optionalStringField(
	VALIDATION_LIMITS.referrerName.max,
	"紹介者名",
);

export const trialDateSchema = dateOnlySchema("体験日");
export const birthDateSchema = dateOnlySchema("生年月日");

// 性別（DBには英語キーが入る。ラベルは back/src/utils/mail.ts の確認メールと同じ）
export const genderSchema = z.enum(["male", "female", "other"], {
	error: "性別を選択してください。",
});

export type Gender = z.infer<typeof genderSchema>;

export const GENDER_LABELS: Record<Gender, string> = {
	male: "男性",
	female: "女性",
	other: "その他",
};

// 体験のきっかけ（ラベルは back/src/utils/mail.ts の確認メールと同じ）
export const motivationSchema = z.enum(
	["flyer", "instagram", "referral", "other"],
	{ error: "体験のきっかけを選択してください。" },
);

export type Motivation = z.infer<typeof motivationSchema>;

export const MOTIVATION_LABELS: Record<Motivation, string> = {
	flyer: "学校で配布されたチラシ",
	instagram: "インスタグラム",
	referral: "西尾ブレイズの選手、スタッフからの紹介",
	other: "その他",
};
