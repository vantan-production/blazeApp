// アンケート・出欠確認（管理側）の型と、画面表示・送信用の小さな補助。
// API: back/src/survey/*。レスポンスの形は read.ts・results.ts・manage.ts、
// 入力の制約は schemas.ts（作成・更新）に合わせている。

import { z } from "zod";
import { API_BASE_URL, ApiError } from "@/lib/apiClient";
// lib/validation/limits.ts の型にはアンケートの上限がまだ無いため、生成済みの JSON から直接読む
// （値は back の VALIDATION_LIMITS と同じ。npm run sync:validation で再生成される）
import limits from "@/lib/validation/limits.generated.json";
import type { ApiSuccess } from "./api";
import { adminRoutes } from "./routes";

/** 一覧の1件（GET /api/surveys） */
export type SurveySummary = {
	id: string;
	title: string;
	/** 説明文（任意） */
	body: string | null;
	/** 回答締切（null なら締切なし） */
	closes_at: string | null;
	/** 複数選択を許可するか */
	allow_multiple: boolean;
	/** 作成した管理者の名前（退会済みは「元管理者」） */
	admin_name: string;
	/** 締切を過ぎているか（back が取得時点で判定する） */
	is_closed: boolean;
	created_at: string;
	updated_at: string;
};

/** 選択肢（sort_order の順に並ぶ） */
export type SurveyOption = {
	id: string;
	label: string;
	sort_order: number;
};

/** 詳細（GET /api/surveys/:id）。my_response（自分の回答）は管理画面では使わない */
export type SurveyDetail = SurveySummary & {
	options: SurveyOption[];
};

/** 回答者（集計結果の選択肢ごとの投票者） */
export type SurveyVoter = {
	id: string;
	name: string;
	email: string | null;
};

/** 集計結果（GET /api/surveys/:id/results） */
export type SurveyResults = {
	/** 回答した人数（複数選択でも1人1回で数える） */
	respondent_count: number;
	options: {
		option_id: string;
		label: string;
		sort_order: number;
		count: number;
		voters: SurveyVoter[];
	}[];
	/** 自由記述（1人1件） */
	comments: { user_id: string; name: string; comment: string }[];
};

/** 管理画面のロール（back/src/db/roleGuard.ts の Role と同じ） */
export type SurveyParticipantRole = "owner" | "admin" | "member";

export const surveyParticipantRoleLabel: Record<SurveyParticipantRole, string> =
	{
		owner: "オーナー",
		admin: "投稿担当",
		member: "関係者",
	};

/** 未回答者一覧（GET /api/surveys/:id/pending。対象は削除済みを除く全ユーザー） */
export type SurveyPending = {
	total: number;
	responded_count: number;
	pending_count: number;
	pending: {
		id: string;
		name: string;
		email: string;
		role: SurveyParticipantRole;
	}[];
};

/** 選択肢の数の上限・下限（back/src/survey/schemas.ts） */
export const SURVEY_OPTION_MIN = 2;
export const SURVEY_OPTION_MAX = 20;

const textField = (min: number, max: number, label: string) =>
	z
		.string()
		.trim()
		.min(min, `${label}を入力してください。`)
		.max(max, `${label}は${max}文字以内で入力してください。`);

/** 作成・編集フォームの入力チェック（back の createSurveySchema と同じ制約） */
export const surveyFormSchema = z.object({
	title: textField(limits.surveyTitle.min, limits.surveyTitle.max, "タイトル"),
	// 説明は任意。空欄なら送らない（編集では空欄にすると消える）
	body: z.union([
		z.literal(""),
		textField(limits.body.min, limits.body.max, "説明"),
	]),
	// datetime-local の値（空欄なら締切なし）
	closesAt: z.string(),
	allowMultiple: z.boolean(),
	options: z
		.array(
			z.object({
				key: z.string(),
				label: textField(
					limits.surveyOptionLabel.min,
					limits.surveyOptionLabel.max,
					"選択肢",
				),
			}),
		)
		.min(SURVEY_OPTION_MIN, `選択肢は${SURVEY_OPTION_MIN}つ以上必要です。`)
		.max(
			SURVEY_OPTION_MAX,
			`選択肢は${SURVEY_OPTION_MAX}個以内にしてください。`,
		)
		.refine(
			(options) =>
				new Set(options.map((option) => option.label.trim())).size ===
				options.length,
			"同じ選択肢が2つ以上あります。",
		),
});

export type SurveyFormValues = z.input<typeof surveyFormSchema>;

const pad = (n: number) => String(n).padStart(2, "0");

/** 2026/10/05 のような日付 */
export const formatSurveyDate = (iso: string) => {
	const date = new Date(iso);
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};

/** 2026/10/05 18:30 のような日時（締切など） */
export const formatSurveyDateTime = (iso: string) => {
	const date = new Date(iso);
	return `${formatSurveyDate(iso)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** ISO 日時 → <input type="datetime-local"> の値（端末の時刻で表す） */
export const toDateTimeLocalValue = (iso: string | null) => {
	if (!iso) return "";
	const date = new Date(iso);
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** <input type="datetime-local"> の値 → back が受け取る ISO 8601（空欄は null = 締切なし） */
export const fromDateTimeLocalValue = (value: string) =>
	value ? new Date(value).toISOString() : null;

/** <input type="datetime-local"> の値が今以前の日時か（空欄は締切なしなので false） */
export const isPastDateTimeLocal = (value: string) =>
	value !== "" && new Date(value).getTime() <= Date.now();

/** 割合（0〜100 の整数。分母が0なら0） */
export const toPercent = (count: number, total: number) =>
	total === 0 ? 0 : Math.round((count / total) * 100);

type ApiFailure = {
	errors?: string | { field: string; message: string }[];
};

/**
 * JSON を送る（アンケートの作成・更新）。
 * apiClient はエラー時に back の文言を捨ててしまうため、入力エラーの理由を画面に出せるようここで送る。
 * 認証は apiClient と同じく HttpOnly Cookie（credentials: "include"）で行う
 */
export const sendSurveyJson = async <T>(
	endpoint: string,
	payload: unknown,
	method: "POST" | "PATCH",
): Promise<ApiSuccess<T>> => {
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
		credentials: "include",
	});

	const body: unknown = await response.json().catch(() => null);

	if (!response.ok) {
		// 未ログイン・セッション切れは管理画面のログインへ戻す
		if (response.status === 401 && typeof window !== "undefined") {
			window.location.href = adminRoutes.login;
		}
		const { errors } = (body ?? {}) as ApiFailure;
		const message =
			typeof errors === "string"
				? errors
				: Array.isArray(errors) && errors[0]
					? errors[0].message
					: `API Error: ${response.statusText}`;
		throw new ApiError(message, response.status);
	}

	return body as ApiSuccess<T>;
};
