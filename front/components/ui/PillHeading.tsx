type Props = {
	children: React.ReactNode;
	/** section: ページ内の大見出し（2116:1216） / label: パネル内の小見出し（902:339） */
	variant?: "section" | "label";
	as?: "h1" | "h2" | "h3";
};

const variantClass = {
	section:
		"px-[clamp(24px,13vw,52px)] py-6 text-[clamp(18px,5.5vw,22px)] font-medium leading-[22px] tracking-[1px]",
	label:
		"px-[clamp(20px,11.5vw,46px)] py-3 font-savate text-[clamp(16px,5vw,20px)] leading-[22px]",
} as const;

/** 黄色のピル型見出し */
export function PillHeading({
	children,
	variant = "section",
	as = "h2",
}: Props) {
	const Tag = as;
	return (
		<Tag
			className={`inline-flex max-w-full items-center justify-center rounded-[1000px] bg-brand-yellow text-center whitespace-nowrap text-brand-blue ${variantClass[variant]}`}
		>
			{children}
		</Tag>
	);
}
