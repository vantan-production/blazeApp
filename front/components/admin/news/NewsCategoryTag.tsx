type Props = {
	children: React.ReactNode;
};

/** ニュースのカテゴリータグ。ui/Tag は固定のカテゴリーしか受け取れないため、同じ見た目で自由入力のカテゴリーを表示する */
export function NewsCategoryTag({ children }: Props) {
	return (
		<span className="min-w-0 truncate rounded-[200px] bg-white px-[10px] text-[12px] leading-[22px] tracking-[1px] text-brand-blue">
			{children}
		</span>
	);
}
