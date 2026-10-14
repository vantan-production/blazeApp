import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getAchievementById } from "@/components/results/api";
import { ActivityGallery } from "@/components/top/ActivityGallery";
import { FramedImage } from "@/components/ui/FramedImage";
import { routes } from "@/lib/routes";

type Props = {
	params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params;
	const achievement = await getAchievementById(id);
	return {
		title: achievement
			? `${achievement.title.replace(/\n/g, "")} | 西尾ブレイズ`
			: "実績 | 西尾ブレイズ",
	};
}

/**
 * 実績の詳細。サムネイルと本文の画像をすべて見られるようにする。
 * Figmaに詳細画面のデザインが無いため、ニュース詳細と同じ共通部品で組んでいる
 */
export default async function AchievementDetailPage({ params }: Props) {
	const { id } = await params;
	const achievement = await getAchievementById(id);
	if (!achievement) notFound();

	return (
		<PageShell>
			<main className="flex flex-col items-center gap-6 px-6 py-5 text-brand-white">
				<Link
					href={routes.resultsAchievements}
					className="-ml-2 flex items-center self-start py-1 pr-2 text-[14px] leading-[22px] tracking-[1px]"
				>
					<ChevronLeft aria-hidden size={24} strokeWidth={2} />
					実績一覧へ戻る
				</Link>
				<article className="flex w-full flex-col items-center gap-6">
					<header className="flex w-full flex-col gap-1">
						<time
							dateTime={achievement.dateTime}
							className="px-[2px] text-[14px] leading-[22px] tracking-[1px]"
						>
							{achievement.date}
						</time>
						<h1 className="text-[18px] leading-[22px] tracking-[1px] whitespace-pre-line">
							{achievement.title}
						</h1>
					</header>
					{achievement.images.length > 1 ? (
						<ActivityGallery
							label="実績の写真"
							photos={achievement.images.map((src, i) => ({
								src,
								alt: `${i + 1}枚目の写真`,
							}))}
						/>
					) : (
						<FramedImage
							src={achievement.images[0]}
							alt=""
							width={354}
							height={236}
						/>
					)}
					<p className="w-full text-[16px] leading-[22px] tracking-[1.5px] break-all whitespace-pre-wrap">
						{achievement.body}
					</p>
				</article>
			</main>
		</PageShell>
	);
}
