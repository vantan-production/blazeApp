// 試合結果（管理側）の型と、フォームの検証・表示用の小さな補助。
// API: back/src/matchResult/*。入力の制約は back/src/matchResult/schemas.ts と同じ。

import { z } from "zod";
import type { MatchOutcome, MatchSet } from "@/lib/matchSets";
// 上限値は back の VALIDATION_LIMITS から生成した JSON を使う（npm run sync:validation で再生成される）
import limits from "@/lib/validation/limits.generated.json";

/** 1試合で入力できるセット数の上限（決勝の3セットマッチ） */
export const MAX_MATCH_SETS = limits.matchSets.max;

/** API の1セット分の得点 */
export type MatchSetResponse = {
	our_score: number;
	opponent_score: number;
};

/** 一覧・詳細の1件（GET /api/match-results） */
export type MatchResult = {
	id: string;
	tournament_name: string;
	/** 大会での成績（例: ベスト8）。未登録なら null */
	tournament_result: string | null;
	/** 試合日（YYYY-MM-DD） */
	played_on: string;
	/** 対戦相手（任意）。無ければ null */
	opponent_name: string | null;
	/** セットごとの得点。対戦相手があるときは1〜3セット、無いときは空 */
	sets: MatchSetResponse[];
	/** 登録した管理者の名前（退会済みは「元管理者」） */
	admin_name: string;
	created_at: string;
	updated_at: string;
};

/** 1セット分の入力値。得点は入力欄の文字列のまま持ち、送信前に数値へ変える */
export type MatchSetFormValues = {
	ourScore: string;
	opponentScore: string;
};

/** フォームの入力値 */
export type MatchResultFormValues = {
	tournamentName: string;
	tournamentResult: string;
	playedOn: string;
	opponentName: string;
	/** 対戦相手を入れたときだけ使う（1〜3セット） */
	sets: MatchSetFormValues[];
};

const scoreText = (label: string) =>
	z
		.string()
		.trim()
		.min(1, `${label}を入力してください。`)
		.regex(/^\d+$/, `${label}は0以上の整数で入力してください。`)
		.refine(
			(v) => Number(v) <= limits.score.max,
			`${label}は${limits.score.max}以下で入力してください。`,
		);

const setFormSchema = z.object({
	ourScore: scoreText("自チームの得点"),
	opponentScore: scoreText("相手の得点"),
});

export const matchResultFormSchema = z
	.object({
		tournamentName: z
			.string()
			.trim()
			.min(1, "大会名を入力してください。")
			.max(
				limits.tournamentName.max,
				`大会名は${limits.tournamentName.max}文字以内で入力してください。`,
			),
		tournamentResult: z
			.string()
			.trim()
			.max(
				limits.tournamentResult.max,
				`大会成績は${limits.tournamentResult.max}文字以内で入力してください。`,
			),
		playedOn: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "試合日を選んでください。"),
		opponentName: z
			.string()
			.trim()
			.max(
				limits.opponentName.max,
				`対戦相手は${limits.opponentName.max}文字以内で入力してください。`,
			),
		// 対戦相手が空なら得点は送らないため、ここでは形だけ見て中身は下で確かめる
		sets: z.array(
			z.object({ ourScore: z.string(), opponentScore: z.string() }),
		),
	})
	.superRefine((values, ctx) => {
		// 対戦相手を入れたときだけ、表示しているセットの得点を確かめる
		if (!values.opponentName.trim()) return;
		values.sets.forEach((set, index) => {
			const result = setFormSchema.safeParse(set);
			if (result.success) return;
			for (const issue of result.error.issues) {
				ctx.addIssue({
					code: "custom",
					path: ["sets", index, ...issue.path],
					message: issue.message,
				});
			}
		});
	});

/** フォームの検証結果。キーは "tournamentName" や "sets.0.ourScore" のような入力欄の場所 */
export type MatchResultFormErrors = Partial<Record<string, string>>;

/** 入力値を検証し、入力欄ごとの最初のエラーメッセージを返す（エラーが無ければ空） */
export function validateMatchResultForm(
	values: MatchResultFormValues,
): MatchResultFormErrors {
	const result = matchResultFormSchema.safeParse(values);
	if (result.success) return {};
	const errors: MatchResultFormErrors = {};
	for (const issue of result.error.issues) {
		const key = issue.path.join(".");
		if (!(key in errors)) errors[key] = issue.message;
	}
	return errors;
}

export const emptyMatchSet: MatchSetFormValues = {
	ourScore: "",
	opponentScore: "",
};

export const emptyMatchResultForm: MatchResultFormValues = {
	tournamentName: "",
	tournamentResult: "",
	playedOn: "",
	opponentName: "",
	sets: [emptyMatchSet],
};

export const toMatchResultForm = (
	result: MatchResult,
): MatchResultFormValues => ({
	tournamentName: result.tournament_name,
	tournamentResult: result.tournament_result ?? "",
	playedOn: result.played_on,
	opponentName: result.opponent_name ?? "",
	sets:
		result.sets.length > 0
			? result.sets.map((set) => ({
					ourScore: String(set.our_score),
					opponentScore: String(set.opponent_score),
				}))
			: [emptyMatchSet],
});

/**
 * 送信用のボディ。大会成績は空欄なら null（成績なし）。
 * 対戦相手が空欄なら対戦相手なし（null）として、得点も送らない（空配列）
 */
export const toMatchResultPayload = (values: MatchResultFormValues) => {
	const opponentName = values.opponentName.trim();
	return {
		tournament_name: values.tournamentName.trim(),
		tournament_result: values.tournamentResult.trim() || null,
		played_on: values.playedOn,
		opponent_name: opponentName || null,
		sets: opponentName
			? values.sets.map((set) => ({
					our_score: Number(set.ourScore),
					opponent_score: Number(set.opponentScore),
				}))
			: [],
	};
};

/** API のセットの得点を勝敗の計算に使う形にする */
export const toMatchSets = (sets: MatchSetResponse[]): MatchSet[] =>
	sets.map((set) => ({
		ourScore: set.our_score,
		opponentScore: set.opponent_score,
	}));

/** 試合日（YYYY-MM-DD）を「2026/10/4」の形で表示する。日付だけなのでタイムゾーンの変換はしない */
export const formatPlayedOn = (playedOn: string) => {
	const [y, m, d] = playedOn.split("-").map(Number);
	return `${y}/${m}/${d}`;
};

export const matchOutcomeLabel: Record<MatchOutcome, string> = {
	win: "勝ち",
	lose: "負け",
	draw: "引き分け",
};
