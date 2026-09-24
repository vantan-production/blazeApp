type Props = {
	title: string;
	children: React.ReactNode;
};

/** 見出し（h2: 22px）＋本文の情報ブロック（Figma: Frame 78 / 38 / 85 / 95） */
export function InfoSection({ title, children }: Props) {
	return (
		<section className="flex w-full flex-col py-[10px]">
			<h2 className="px-[10px] py-[30px] text-[22px] leading-[22px] tracking-[1.5px]">
				{title}
			</h2>
			<div className="text-[16px] leading-[22px] tracking-[1.5px]">
				{children}
			</div>
		</section>
	);
}
