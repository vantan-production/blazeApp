import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { AchievementCarousel } from "@/components/results/AchievementCarousel";
import {
	getAchievements,
	getMatchPhotos,
	getMediaItems,
} from "@/components/results/api";
import {
	highlightPhotos,
	lastMatch,
	teamGoal,
} from "@/components/results/data";
import { EmptyNote } from "@/components/results/EmptyNote";
import { LastResultCard } from "@/components/results/LastResultCard";
import { MediaList } from "@/components/results/MediaList";
import { PeekCarousel } from "@/components/results/PeekCarousel";
import { ResultSection } from "@/components/results/ResultSection";
import { StaggeredGallery } from "@/components/results/StaggeredGallery";
import { PageTitle } from "@/components/ui/PageTitle";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
	title: "実績・試合結果 | 西尾ブレイズ",
};

/** 実績・試合結果ページ（ベース: Figma 実績・試合結果 1030:334） */
export default async function ResultsPage() {
	// 互いに依存しないので並列に取得する
	const [achievements, matchPhotos, mediaItems] = await Promise.all([
		getAchievements(),
		getMatchPhotos(),
		getMediaItems(),
	]);

	return (
		<PageShell>
			<main className="flex w-full flex-col items-center">
				<PageTitle>実績・試合結果</PageTitle>
				<div className="flex w-full flex-col px-[clamp(16px,5.97vw,24px)]">
					<ResultSection title="前回の試合結果">
						<LastResultCard {...lastMatch} />
					</ResultSection>
					<ResultSection title="チーム目標">
						<div className="relative w-full rounded-[20px] bg-brand-yellow px-6 py-8 text-brand-blue">
							<span
								aria-hidden
								className="absolute top-2 left-4 font-savate text-[56px] leading-none text-brand-red"
							>
								“
							</span>
							<p className="text-center font-mincho text-[clamp(18px,5.5vw,22px)] leading-[1.6] font-bold tracking-[1px] text-balance">
								{teamGoal}
							</p>
							<span
								aria-hidden
								className="absolute right-4 bottom-[-12px] font-savate text-[56px] leading-none text-brand-red"
							>
								”
							</span>
						</div>
					</ResultSection>
					{/* 空のときは遷移先にも何も無いので「もっと見る」を出さない */}
					<ResultSection
						title="実績"
						moreHref={
							achievements.length > 0 ? routes.resultsAchievements : undefined
						}
					>
						{achievements.length > 0 ? (
							<AchievementCarousel items={achievements} />
						) : (
							<EmptyNote>実績は準備中です</EmptyNote>
						)}
					</ResultSection>
					<ResultSection
						title="試合風景"
						moreHref={
							matchPhotos.length > 0 ? routes.resultsMatchPhotos : undefined
						}
					>
						{matchPhotos.length > 0 ? (
							<StaggeredGallery photos={matchPhotos} />
						) : (
							<EmptyNote>試合風景は準備中です</EmptyNote>
						)}
					</ResultSection>
					{/* TODO: 名場面の一覧ページ（とbackのデータ）ができたら「もっと見る」を付ける */}
					<ResultSection title="選手たちの名場面集">
						<PeekCarousel photos={highlightPhotos} />
					</ResultSection>
					<ResultSection
						title="メディア情報"
						moreHref={mediaItems.length > 0 ? routes.resultsMedia : undefined}
					>
						{mediaItems.length > 0 ? (
							<MediaList items={mediaItems} />
						) : (
							<EmptyNote>メディア情報は準備中です</EmptyNote>
						)}
					</ResultSection>
				</div>
			</main>
		</PageShell>
	);
}
