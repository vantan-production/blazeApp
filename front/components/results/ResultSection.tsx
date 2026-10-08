import Image from "next/image";
import Link from "next/link";

type Props = {
	title: string;
	/** 指定すると右下に「もっと見る」リンクを出す */
	moreHref?: string;
	children: React.ReactNode;
};

/** 見出し＋黄・赤のアクセント線＋本文＋「もっと見る」のセクション */
export function ResultSection({ title, moreHref, children }: Props) {
	return (
		<section className="flex w-full flex-col items-center gap-8 pt-12 pb-6">
			<div className="flex flex-col items-center gap-2">
				<h2 className="text-[clamp(20px,6.2vw,24px)] font-bold tracking-[2px] whitespace-nowrap">
					{title}
				</h2>
				<span aria-hidden className="flex gap-1">
					<span className="h-[3px] w-8 rounded-full bg-brand-yellow" />
					<span className="h-[3px] w-3 rounded-full bg-brand-red" />
				</span>
			</div>
			{children}
			{moreHref && (
				<div className="flex w-full justify-end">
					<Link
						href={moreHref}
						className="flex items-center gap-1 rounded-full border-2 border-brand-white py-1 pr-2 pl-5 text-[14px] tracking-[1px] transition-opacity hover:opacity-70"
					>
						もっと見る
						<Image src="/icons/arrow-right.svg" alt="" width={12} height={24} />
					</Link>
				</div>
			)}
		</section>
	);
}
