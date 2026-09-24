import { PillHeading } from "./PillHeading";

type Props = {
	title?: string;
	/** 見出しのレベル。ページ構成に合わせて見出し階層が飛ばないように指定する */
	titleAs?: "h2" | "h3";
	/** 本文の揃え */
	align?: "left" | "center";
	children: React.ReactNode;
};

/** 白背景の角丸パネル。上部に黄色ラベル見出しを置ける（Figma: column 2117:908） */
export function ContentPanel({
	title,
	titleAs = "h3",
	align = "left",
	children,
}: Props) {
	return (
		<section className="flex w-full flex-col items-center gap-8 rounded-[20px] bg-brand-white p-5 text-brand-blue">
			{title && (
				<PillHeading variant="label" as={titleAs}>
					{title}
				</PillHeading>
			)}
			<div
				className={`w-full text-[16px] leading-[22px] tracking-[1.5px] ${
					align === "center" ? "text-center" : ""
				}`}
			>
				{children}
			</div>
		</section>
	);
}
