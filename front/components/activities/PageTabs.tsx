type Tab = { label: React.ReactNode; href: string };

type Props = {
	/** 現在表示中のタブ（白背景） */
	current: Tab;
	/** もう一方のタブ（青背景＋白枠） */
	other: Tab;
};

/** ページ上部の2択タブ。ページ内の各セクションへ移動する（Figma: title 978:290） */
export function PageTabs({ current, other }: Props) {
	return (
		<nav
			aria-label="ページ内メニュー"
			className="flex w-full items-center justify-center gap-4 border-y-2 border-brand-white px-5 py-4"
		>
			<a
				href={current.href}
				aria-current="true"
				className="flex min-w-0 flex-1 items-center justify-center rounded-[1000px] bg-brand-white px-6 py-[2.5px] text-center text-[18px] leading-[22px] tracking-[1.5px] whitespace-nowrap text-brand-black"
			>
				{current.label}
			</a>
			<span aria-hidden className="h-5 w-[2px] rounded-full bg-brand-white" />
			<a
				href={other.href}
				className="flex min-w-0 flex-1 items-center justify-center rounded-[1000px] border-2 border-brand-white bg-brand-blue px-6 py-3 text-center text-[18px] leading-[22px] tracking-[1.5px] whitespace-nowrap text-brand-white"
			>
				{other.label}
			</a>
		</nav>
	);
}
