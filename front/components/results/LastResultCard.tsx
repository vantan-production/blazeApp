type Props = {
	ourScore: number;
	opponentScore: number;
	ourTeam: string;
	/** 改行位置は "\n" で指定する */
	opponentTeam: string;
};

const outcomeLabel = { win: "WIN", lose: "LOSE", draw: "DRAW" } as const;

/**
 * 前回の試合結果のスコアボード。上部の黄帯・勝敗バッジ・両チームのスコアを並べる。
 * 狭い画面ではスコア・チーム名・余白をclamp()で縮めてカードに収める
 */
export function LastResultCard({
	ourScore,
	opponentScore,
	ourTeam,
	opponentTeam,
}: Props) {
	const outcome =
		ourScore > opponentScore
			? "win"
			: ourScore < opponentScore
				? "lose"
				: "draw";

	return (
		<div className="relative w-full overflow-hidden rounded-[20px] bg-brand-white text-brand-blue shadow-[0_8px_0_0_var(--brand-yellow)]">
			<div className="flex items-center justify-center bg-brand-yellow py-2 font-savate text-[16px] leading-none tracking-[4px]">
				FINAL SCORE
			</div>
			<div className="flex flex-col items-center gap-3 px-[clamp(8px,3vw,16px)] pt-5 pb-6">
				<span
					className={`rounded-full px-4 py-1 font-savate text-[14px] leading-none tracking-[2px] text-brand-white ${
						outcome === "win" ? "bg-brand-red" : "bg-brand-blue"
					}`}
				>
					{outcomeLabel[outcome]}
				</span>
				<div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-[clamp(4px,2vw,8px)]">
					<TeamScore
						score={ourScore}
						team={ourTeam}
						highlight={outcome === "win"}
					/>
					<span className="font-savate text-[clamp(18px,5.5vw,22px)] text-brand-blue/50">
						VS
					</span>
					<TeamScore
						score={opponentScore}
						team={opponentTeam}
						highlight={outcome === "lose"}
					/>
				</div>
			</div>
		</div>
	);
}

function TeamScore({
	score,
	team,
	highlight,
}: {
	score: number;
	team: string;
	highlight: boolean;
}) {
	return (
		<div className="flex min-w-0 flex-col items-center gap-2">
			<span
				className={`font-inter text-[clamp(48px,16vw,64px)] leading-none font-black tabular-nums ${
					highlight ? "text-brand-red" : ""
				}`}
			>
				{score}
			</span>
			<span aria-hidden className="h-[2px] w-8 rounded-full bg-brand-blue/20" />
			<p className="text-center text-[clamp(12px,3.7vw,15px)] leading-[1.3] font-bold whitespace-pre">
				{team}
			</p>
		</div>
	);
}
