import Link from "next/link";
import {
	formatPlayedOn,
	type MatchResult,
	matchOutcomeLabel,
	toMatchSets,
} from "@/lib/admin/matchResults";
import { adminMatchResultEditPath } from "@/lib/admin/routes";
import { summarizeSets } from "@/lib/matchSets";

type Props = {
	result: MatchResult;
};

/**
 * 試合結果一覧の一行（試合日・大会名と成績・スコア）。行全体が編集画面へのリンク。
 * 対戦相手が無い結果はスコアの行を出さない
 */
export function MatchResultListItem({ result }: Props) {
	const summary =
		result.opponent_name !== null && result.sets.length > 0
			? summarizeSets(toMatchSets(result.sets))
			: null;
	return (
		<li className="flex flex-col gap-6 after:h-px after:w-full after:bg-white">
			<Link
				href={adminMatchResultEditPath(result.id)}
				className="flex flex-col gap-1 text-brand-white transition-opacity hover:opacity-80"
			>
				<time
					dateTime={result.played_on}
					className="px-[2px] text-[14px] leading-[22px] tracking-[1px]"
				>
					{formatPlayedOn(result.played_on)}
				</time>
				<p className="text-[18px] leading-[26px] tracking-[1px] break-all">
					{result.tournament_name}
					{result.tournament_result && (
						<span className="ml-2 rounded-full bg-brand-yellow px-2 py-[2px] align-middle text-[12px] leading-none font-bold text-brand-blue">
							{result.tournament_result}
						</span>
					)}
				</p>
				{summary && (
					<p className="text-[14px] leading-[22px] tracking-[1px] break-all">
						<span className="font-bold tabular-nums">
							{summary.ourScore} - {summary.opponentScore}
						</span>
						{summary.isSetCount && (
							<span className="ml-1 text-[12px] tabular-nums opacity-80">
								（
								{result.sets
									.map((set) => `${set.our_score}-${set.opponent_score}`)
									.join(" / ")}
								）
							</span>
						)}
						<span className="ml-2">vs {result.opponent_name}</span>
						<span
							className={`ml-2 text-[12px] ${summary.outcome === "win" ? "text-[#ffb3b3]" : "opacity-80"}`}
						>
							（{matchOutcomeLabel[summary.outcome]}）
						</span>
					</p>
				)}
			</Link>
		</li>
	);
}
