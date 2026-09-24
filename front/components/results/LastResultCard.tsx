type Props = {
	ourScore: number;
	opponentScore: number;
	ourTeam: string;
	/** 改行位置は "\n" で指定する */
	opponentTeam: string;
};

/**
 * 前回の試合結果カード（Figma: last time results 1031:551）。
 * 402px幅でFigma通り、狭い画面ではチーム名・VS・余白をclamp()で縮めてカードに収める
 */
export function LastResultCard({
	ourScore,
	opponentScore,
	ourTeam,
	opponentTeam,
}: Props) {
	return (
		<section className="flex w-full flex-col items-center gap-6">
			<h2 className="px-[10px] py-[30px] text-[26px]">前回の試合結果</h2>
			<div className="flex w-full flex-col items-center gap-[10px] overflow-hidden rounded-[16px] bg-white p-[clamp(4px,2.49vw,10px)] font-black text-black">
				<p className="px-[10px] py-1 text-[40px]">
					{ourScore} - {opponentScore}
				</p>
				<span aria-hidden className="h-[2px] w-[60px] rounded-full bg-black" />
				<div className="flex w-full items-center justify-center gap-[clamp(4px,2.49vw,10px)] px-[clamp(4px,2.49vw,10px)] py-4">
					<p className="flex-1 p-[clamp(4px,2.49vw,10px)] text-center text-[clamp(12px,3.98vw,16px)] whitespace-pre">
						{ourTeam}
					</p>
					<span className="text-[clamp(24px,7.96vw,32px)]">VS</span>
					<p className="flex-1 p-[clamp(4px,2.49vw,10px)] text-center text-[clamp(12px,3.98vw,16px)] whitespace-pre">
						{opponentTeam}
					</p>
				</div>
			</div>
		</section>
	);
}
