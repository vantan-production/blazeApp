// 試合結果のセットごとの得点から、勝敗と表示用のスコアを求める（管理画面と公開ページで共有する）

/** 1セット分の得点 */
export type MatchSet = {
	ourScore: number;
	opponentScore: number;
};

export type MatchOutcome = "win" | "lose" | "draw";

export type MatchSummary = {
	outcome: MatchOutcome;
	/**
	 * 大きく出すスコア。1セットだけの試合はその得点、複数セットの試合は取ったセット数
	 * （例: 3セットマッチを 2-1 で勝ち）
	 */
	ourScore: number;
	opponentScore: number;
	/** 複数セットの試合か（true ならスコアはセット数） */
	isSetCount: boolean;
};

/** セットごとの得点から勝敗を決める。複数セットは取ったセット数で比べる */
export function summarizeSets(sets: MatchSet[]): MatchSummary {
	const isSetCount = sets.length > 1;
	const [ourScore, opponentScore] = isSetCount
		? sets.reduce(
				([ours, theirs], set) => [
					ours + (set.ourScore > set.opponentScore ? 1 : 0),
					theirs + (set.ourScore < set.opponentScore ? 1 : 0),
				],
				[0, 0],
			)
		: [sets[0]?.ourScore ?? 0, sets[0]?.opponentScore ?? 0];
	const outcome: MatchOutcome =
		ourScore > opponentScore
			? "win"
			: ourScore < opponentScore
				? "lose"
				: "draw";
	return { outcome, ourScore, opponentScore, isSetCount };
}
