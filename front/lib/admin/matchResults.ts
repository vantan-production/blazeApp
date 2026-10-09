// 試合結果（管理側）の型と、フォームの検証・表示用の小さな補助。
// API: back/src/matchResult/*。入力の制約は back/src/matchResult/schemas.ts と同じ。

import { z } from "zod";
// 上限値は back の VALIDATION_LIMITS から生成した JSON を使う（npm run sync:validation で再生成される）
import limits from "@/lib/validation/limits.generated.json";

/** 一覧・詳細の1件（GET /api/match-results） */
export type MatchResult = {
	id: string;
	tournament_name: string;
	/** 大会での成績（例: ベスト8）。未登録なら null */
	tournament_result: string | null;
	/** 試合日（YYYY-MM-DD） */
	played_on: string;
	opponent_name: string;
	our_score: number;
	opponent_score: number;
	/** 登録した管理者の名前（退会済みは「元管理者」） */
	admin_name: string;
	created_at: string;
	updated_at: string;
};

/** フォームの入力値。得点は入力欄の文字列のまま持ち、送信前に数値へ変える */
export type MatchResultFormValues = {
	tournamentName: string;
	tournamentResult: string;
	playedOn: string;
	opponentName: string;
	ourScore: string;
	opponentScore: string;
};

const requiredText = (label: string, max: number) =>
	z
		.string()
		.trim()
		.min(1, `${label}を入力してください。`)
		.max(max, `${label}は${max}文字以内で入力してください。`);

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

export const matchResultFormSchema = z.object({
	tournamentName: requiredText("大会名", limits.tournamentName.max),
	tournamentResult: z
		.string()
		.trim()
		.max(
			limits.tournamentResult.max,
			`大会成績は${limits.tournamentResult.max}文字以内で入力してください。`,
		),
	playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "試合日を選んでください。"),
	opponentName: requiredText("対戦相手", limits.opponentName.max),
	ourScore: scoreText("自チームの得点"),
	opponentScore: scoreText("相手の得点"),
});

export const emptyMatchResultForm: MatchResultFormValues = {
	tournamentName: "",
	tournamentResult: "",
	playedOn: "",
	opponentName: "",
	ourScore: "",
	opponentScore: "",
};

export const toMatchResultForm = (
	result: MatchResult,
): MatchResultFormValues => ({
	tournamentName: result.tournament_name,
	tournamentResult: result.tournament_result ?? "",
	playedOn: result.played_on,
	opponentName: result.opponent_name,
	ourScore: String(result.our_score),
	opponentScore: String(result.opponent_score),
});

/** 送信用のボディ。大会成績は空欄なら null（成績なし）で送る */
export const toMatchResultPayload = (values: MatchResultFormValues) => ({
	tournament_name: values.tournamentName.trim(),
	tournament_result: values.tournamentResult.trim() || null,
	played_on: values.playedOn,
	opponent_name: values.opponentName.trim(),
	our_score: Number(values.ourScore),
	opponent_score: Number(values.opponentScore),
});

/** 試合日（YYYY-MM-DD）を「2026/10/4」の形で表示する。日付だけなのでタイムゾーンの変換はしない */
export const formatPlayedOn = (playedOn: string) => {
	const [y, m, d] = playedOn.split("-").map(Number);
	return `${y}/${m}/${d}`;
};

export type MatchOutcome = "win" | "lose" | "draw";

export const matchOutcome = (ours: number, theirs: number): MatchOutcome =>
	ours > theirs ? "win" : ours < theirs ? "lose" : "draw";

export const matchOutcomeLabel: Record<MatchOutcome, string> = {
	win: "勝ち",
	lose: "負け",
	draw: "引き分け",
};
