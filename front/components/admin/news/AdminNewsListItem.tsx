type Props = {
	/** カテゴリー（未設定の投稿もある） */
	category: string | null;
	/** 表示用の日付（YYYY/MM/DD） */
	date: string;
	title: string;
};

/** 投稿済みニュースの一行（Figma: Frame 155 1700:373）。カテゴリータグ＋日付＋タイトル＋白い区切り線 */
export function AdminNewsListItem({ category, date, title }: Props) {
	return (
		<li className="flex flex-col gap-6 after:h-px after:w-full after:bg-white">
			<div className="flex flex-col gap-1 text-brand-white">
				<div className="flex items-center gap-1">
					{category && (
						// ui/Tag は固定のカテゴリーしか受け取れないため、同じ見た目で自由入力のカテゴリーを表示する
						<span className="inline-flex items-center justify-center rounded-[200px] bg-white px-[10px] text-[12px] leading-[22px] tracking-[1px] whitespace-nowrap text-brand-blue">
							{category}
						</span>
					)}
					<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
						{date}
					</time>
				</div>
				<p className="text-[18px] leading-[22px] tracking-[1px] break-all">
					{title}
				</p>
			</div>
		</li>
	);
}
