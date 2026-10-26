type Props = {
	children: React.ReactNode;
	as?: "h2" | "h3";
};

/**
 * ページ内の大見出し。白い太字の下に黄・赤のアクセント線を添える。
 * ボタン（黄色のピル型）と見分けがつくよう、見出しには塗りを使わない
 */
export function SectionHeading({ children, as: Tag = "h2" }: Props) {
	return (
		<div className="flex flex-col items-center gap-2">
			<Tag className="text-center text-[clamp(20px,6.2vw,24px)] font-bold tracking-[2px] text-brand-white">
				{children}
			</Tag>
			<span aria-hidden className="flex gap-1">
				<span className="h-[3px] w-8 rounded-full bg-brand-yellow" />
				<span className="h-[3px] w-3 rounded-full bg-brand-red" />
			</span>
		</div>
	);
}
