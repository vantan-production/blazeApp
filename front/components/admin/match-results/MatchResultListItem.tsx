import Link from "next/link";
import {
	formatPlayedOn,
	type MatchResult,
	matchOutcome,
	matchOutcomeLabel,
} from "@/lib/admin/matchResults";
import { adminMatchResultEditPath } from "@/lib/admin/routes";

type Props = {
	result: MatchResult;
};

/** 試合結果一覧の一行（試合日・大会名と成績・スコア）。行全体が編集画面へのリンク */
export function MatchResultListItem({ result }: Props) {
	const outcome = matchOutcome(result.our_score, result.opponent_score);
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
				<p className="text-[14px] leading-[22px] tracking-[1px] break-all">
					<span className="font-bold tabular-nums">
						{result.our_score} - {result.opponent_score}
					</span>
					<span className="ml-2">vs {result.opponent_name}</span>
					<span
						className={`ml-2 text-[12px] ${outcome === "win" ? "text-[#ffb3b3]" : "opacity-80"}`}
					>
						（{matchOutcomeLabel[outcome]}）
					</span>
				</p>
			</Link>
		</li>
	);
}
