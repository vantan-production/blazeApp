type Props = {
	children: React.ReactNode;
};

/** 紹介ページの大見出し（Figma: 980:326 / 1427:654） */
export function AboutPageTitle({ children }: Props) {
	return (
		<h1 className="px-[10px] py-[30px] text-[24px] font-medium leading-[22px] tracking-[1px] text-brand-white">
			{children}
		</h1>
	);
}
