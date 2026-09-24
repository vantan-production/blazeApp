type Props = {
	children: React.ReactNode;
};

/** ページ上部の見出し（h1）。左に赤い短い線を添える。各ページ共通で使う */
export function PageTitle({ children }: Props) {
	return (
		<div className="w-full px-[clamp(16px,5.97vw,24px)] pt-4 pb-2">
			<h1 className="flex items-center gap-3 text-[20px] font-bold tracking-[2px]">
				<span
					aria-hidden="true"
					className="h-[3px] w-6 shrink-0 bg-brand-red"
				/>
				{children}
			</h1>
		</div>
	);
}
