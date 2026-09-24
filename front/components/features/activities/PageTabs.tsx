type Tab = { label: React.ReactNode; href: string };

type Props = {
	/** 現在表示中のタブ（白背景） */
	current: Tab;
	/** もう一方のタブ（青背景＋白枠） */
	other: Tab;
};

/**
 * ページ上部の2択タブ。ページ内の各セクションへ移動する（Figma: title 978:290）。
 * 402px幅でFigma通り、320px幅まで文字サイズ・余白をclamp()で縮めて文字が枠からはみ出さないようにする
 */
export function PageTabs({ current, other }: Props) {
	return (
		<nav
			aria-label="ページ内メニュー"
			className="flex w-full items-center justify-center gap-[clamp(8px,3.98vw,16px)] border-y-2 border-brand-white px-[clamp(12px,4.98vw,20px)] py-4"
		>
			<a
				href={current.href}
				aria-current="true"
				className="flex min-w-0 flex-1 items-center justify-center rounded-[1000px] bg-brand-white px-[clamp(4px,calc(24.39vw-74px),24px)] py-[2.5px] text-center text-[clamp(14px,4.48vw,18px)] leading-[22px] tracking-[1.5px] whitespace-nowrap text-brand-black"
			>
				{current.label}
			</a>
			<span aria-hidden className="h-5 w-[2px] rounded-full bg-brand-white" />
			<a
				href={other.href}
				className="flex min-w-0 flex-1 items-center justify-center rounded-[1000px] border-2 border-brand-white bg-brand-blue px-[clamp(4px,calc(24.39vw-74px),24px)] py-3 text-center text-[clamp(14px,4.48vw,18px)] leading-[22px] tracking-[1.5px] whitespace-nowrap text-brand-white"
			>
				{other.label}
			</a>
		</nav>
	);
}
