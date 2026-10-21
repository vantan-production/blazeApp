type Props = {
	children: React.ReactNode;
	/** strong: 未読・未回答など目立たせたい印（黄色地） */
	tone?: "default" | "strong";
};

/** 一覧の行に付ける小さなタグ（管理画面のカテゴリータグと同じ形） */
export function MemberTag({ children, tone = "default" }: Props) {
	return (
		<span
			className={`shrink-0 rounded-[200px] px-[10px] text-[12px] leading-[22px] tracking-[1px] ${tone === "strong" ? "bg-brand-yellow font-medium text-brand-black" : "bg-white text-brand-blue"}`}
		>
			{children}
		</span>
	);
}
