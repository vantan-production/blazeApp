import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ActivityGallery } from "@/components/top/ActivityGallery";
import { FramedImage } from "@/components/ui/FramedImage";
import { Tag } from "@/components/ui/Tag";
import { fetchNewsById, formatNewsDate } from "@/lib/news";
import { routes } from "@/lib/routes";

type Props = {
	params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params;
	const news = await fetchNewsById(id);
	return {
		title: news
			? `${news.title.replace(/\n/g, "")} | 西尾ブレイズ`
			: "ニュース | 西尾ブレイズ",
	};
}

/**
 * ニュース詳細。
 * Figmaに詳細画面のデザインが無いため、既存の共通部品で組んだ仮実装
 */
export default async function NewsDetailPage({ params }: Props) {
	const { id } = await params;
	const news = await fetchNewsById(id);
	if (!news) notFound();

	return (
		<PageShell>
			<main className="flex flex-col items-center gap-6 px-6 py-5 text-brand-white">
				<Link
					href={routes.news}
					className="-ml-2 flex items-center self-start py-1 pr-2 text-[14px] leading-[22px] tracking-[1px]"
				>
					<ChevronLeft aria-hidden size={24} strokeWidth={2} />
					ニュース一覧へ戻る
				</Link>
				<article className="flex w-full flex-col items-center gap-6">
					<header className="flex w-full flex-col gap-1">
						<div className="flex items-center gap-1">
							{news.tag && <Tag kind={news.tag} />}
							<time
								dateTime={news.publishedAt}
								className="px-[2px] text-[14px] leading-[22px] tracking-[1px]"
							>
								{formatNewsDate(news.publishedAt)}
							</time>
						</div>
						<h1 className="text-[18px] leading-[22px] tracking-[1px] whitespace-pre-line">
							{news.title}
						</h1>
					</header>
					{news.images.length > 1 ? (
						<ActivityGallery
							label="ニュースの写真"
							photos={news.images.map((src, i) => ({
								src,
								alt: `${i + 1}枚目の写真`,
							}))}
						/>
					) : (
						<FramedImage src={news.images[0]} alt="" width={354} height={236} />
					)}
					<p className="w-full text-[16px] leading-[22px] tracking-[1.5px] break-all">
						{news.body}
					</p>
				</article>
			</main>
		</PageShell>
	);
}
