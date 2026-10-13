import { summarizeSets } from "@/lib/matchSets";
import type { LastMatch } from "./data";

type Props = LastMatch & {
	/** 自チーム名（既定: 西尾ブレイズ） */
	ourTeam?: string;
};

const outcomeLabel = { win: "WIN", lose: "LOSE", draw: "DRAW" } as const;

/**
 * 前回の試合結果のスコアボード。上部の黄帯・大会名と大会成績・勝敗バッジ・両チームのスコアを並べる。
 * 複数セットの試合は取ったセット数を大きく出し、その下にセットごとの得点を並べる。
 * 対戦相手が無い結果は大会名と成績だけを出す。
 * 狭い画面ではスコア・チーム名・余白をclamp()で縮めてカードに収める
 */
export function LastResultCard({
	tournamentName,
	tournamentResult,
	date,
	dateTime,
	sets,
	ourTeam = "西尾ブレイズ",
	opponentTeam,
}: Props) {
	const summary =
		opponentTeam !== undefined && sets.length > 0 ? summarizeSets(sets) : null;

	return (
		<div className="relative w-full overflow-hidden rounded-[20px] bg-brand-white text-brand-blue shadow-[0_8px_0_0_var(--brand-yellow)]">
			<div className="flex items-center justify-center bg-brand-yellow py-2 font-savate text-[16px] leading-none tracking-[4px]">
				{summary ? "FINAL SCORE" : "RESULT"}
			</div>
			<div className="flex flex-col items-center gap-3 px-[clamp(8px,3vw,16px)] pt-5 pb-6">
				<div
					className={`flex w-full flex-col items-center gap-[6px] text-center ${summary ? "border-b border-brand-blue/15 pb-4" : ""}`}
				>
					<time
						dateTime={dateTime}
						className="text-[12px] leading-none tracking-[1px] text-brand-blue/60"
					>
						{date}
					</time>
					<p className="text-[clamp(14px,4.3vw,17px)] leading-[1.4] font-bold tracking-[1px] [overflow-wrap:anywhere] [word-break:auto-phrase]">
						{tournamentName}
					</p>
					{tournamentResult && (
						<span className="rounded-full bg-brand-blue px-4 py-[6px] text-[clamp(14px,4.3vw,16px)] leading-none font-bold tracking-[2px] text-brand-yellow">
							{tournamentResult}
						</span>
					)}
				</div>
				{summary && opponentTeam !== undefined && (
					<>
						<span
							className={`rounded-full px-4 py-1 font-savate text-[14px] leading-none tracking-[2px] text-brand-white ${
								summary.outcome === "win" ? "bg-brand-red" : "bg-brand-blue"
							}`}
						>
							{outcomeLabel[summary.outcome]}
						</span>
						<div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-[clamp(4px,2vw,8px)]">
							<TeamScore
								score={summary.ourScore}
								team={ourTeam}
								highlight={summary.outcome === "win"}
							/>
							{summary.isSetCount ? (
								// セット数（例: 2-1）はスコアのように「-」でつなぐ。数字と同じ大きさ・行にそろえる
								<span className="self-start font-inter text-[clamp(48px,16vw,64px)] leading-none font-black text-brand-blue/50">
									-
								</span>
							) : (
								<span className="font-savate text-[clamp(18px,5.5vw,22px)] text-brand-blue/50">
									VS
								</span>
							)}
							<TeamScore
								score={summary.opponentScore}
								team={opponentTeam}
								highlight={summary.outcome === "lose"}
							/>
						</div>
						{summary.isSetCount && (
							<ol
								aria-label="セットごとの得点"
								className="flex w-full flex-col gap-1 rounded-[12px] bg-brand-blue/5 px-4 py-3"
							>
								{sets.map((set, index) => (
									<li
										// セットの順番そのものが意味を持つため番号をキーにする
										// biome-ignore lint/suspicious/noArrayIndexKey: 上記のとおり
										key={index}
										className="grid grid-cols-[1fr_auto_1fr] items-center text-[14px] leading-[22px] font-bold tabular-nums"
									>
										<span
											className={`text-right ${set.ourScore > set.opponentScore ? "text-brand-red" : ""}`}
										>
											{set.ourScore}
										</span>
										<span className="px-3 text-[11px] font-medium tracking-[1px] text-brand-blue/60">
											第{index + 1}セット
										</span>
										<span
											className={
												set.ourScore < set.opponentScore ? "text-brand-red" : ""
											}
										>
											{set.opponentScore}
										</span>
									</li>
								))}
							</ol>
						)}
					</>
				)}
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
			<p className="text-center text-[clamp(12px,3.7vw,15px)] leading-[1.3] font-bold [overflow-wrap:anywhere] [word-break:auto-phrase]">
				{team}
			</p>
		</div>
	);
}
