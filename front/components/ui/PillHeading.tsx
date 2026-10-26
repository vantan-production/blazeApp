type Props = {
	children: React.ReactNode;
	as?: "h2" | "h3";
};

/** 白パネル内の小見出し。黄色のピル型（Figma: 902:339） */
export function PillHeading({ children, as: Tag = "h3" }: Props) {
	return (
		<Tag className="inline-flex max-w-full items-center justify-center rounded-full bg-brand-yellow px-[clamp(20px,11.5vw,46px)] py-3 text-center text-[clamp(16px,5vw,18px)] leading-[22px] font-medium whitespace-nowrap text-brand-blue">
			{children}
		</Tag>
	);
}
