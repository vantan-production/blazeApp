import Link from "next/link";

type Props = {
	title: string;
	/** 指定すると右下に「もっと見る」リンクを出す */
	moreHref?: string;
	children: React.ReactNode;
};

/** 下線付き見出し＋本文＋「もっと見る」のセクション（Figma: item 1144:342 など） */
export function ResultSection({ title, moreHref, children }: Props) {
	return (
		<section className="flex w-full flex-col items-center gap-8 pt-10 pb-[35px]">
			<h2 className="flex flex-col items-center gap-[10px] text-[24px] whitespace-nowrap after:h-[3px] after:w-[59px] after:bg-brand-white">
				{title}
			</h2>
			{children}
			{moreHref && (
				<div className="flex w-full justify-end px-6">
					<Link
						href={moreHref}
						className="border-b border-brand-white pt-5 pb-1 text-[16px]"
					>
						もっと見る
					</Link>
				</div>
			)}
		</section>
	);
}
