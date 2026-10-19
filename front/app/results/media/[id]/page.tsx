import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getMediaById } from "@/components/results/api";
import { ActivityGallery } from "@/components/top/ActivityGallery";
import { BackLink } from "@/components/ui/BackLink";
import { FramedImage } from "@/components/ui/FramedImage";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { routes } from "@/lib/routes";

type Props = {
	params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params;
	const media = await getMediaById(id);
	return {
		title: media
			? `${media.title.replace(/\n/g, "")} | 西尾ブレイズ`
			: "メディア情報 | 西尾ブレイズ",
	};
}

/**
 * メディア情報の詳細。本文の掲載先URLはリンクにして開けるようにする。
 * Figmaに詳細画面のデザインが無いため、お知らせ詳細と同じ共通部品で組んでいる
 */
export default async function MediaDetailPage({ params }: Props) {
	const { id } = await params;
	const media = await getMediaById(id);
	if (!media) notFound();

	return (
		<PageShell>
			<main className="flex flex-col items-center gap-6 px-6 py-5 text-brand-white">
				{/* 実績・試合結果ページとメディア情報一覧の両方から開くため、来たページへ戻す */}
				<BackLink fallbackHref={routes.resultsMedia}>戻る</BackLink>
				<article className="flex w-full flex-col items-center gap-6">
					<header className="flex w-full flex-col gap-1">
						<time
							dateTime={media.dateTime}
							className="px-[2px] text-[14px] leading-[22px] tracking-[1px]"
						>
							{media.date}
						</time>
						<h1 className="text-[18px] leading-[22px] tracking-[1px] whitespace-pre-line">
							{media.title}
						</h1>
					</header>
					{media.images.length > 1 ? (
						<ActivityGallery
							label="メディア情報の写真"
							photos={media.images.map((src, i) => ({
								src,
								alt: `${i + 1}枚目の写真`,
							}))}
						/>
					) : (
						media.images[0] && (
							<FramedImage
								src={media.images[0]}
								alt=""
								width={354}
								height={236}
							/>
						)
					)}
					<p className="w-full text-[16px] leading-[22px] tracking-[1.5px] break-all whitespace-pre-wrap">
						<LinkifiedText text={media.body} />
					</p>
				</article>
			</main>
		</PageShell>
	);
}
