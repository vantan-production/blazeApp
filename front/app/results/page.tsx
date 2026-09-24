import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { AchievementCarousel } from "@/components/results/AchievementCarousel";
import {
	achievements,
	highlightPhotos,
	lastMatch,
	matchPhotos,
	mediaItems,
	teamGoal,
} from "@/components/results/data";
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

// TODO: 各「もっと見る」の一覧ページが決まったら遷移先を差し替える
const moreHref = routes.news;

/** 実績・試合結果ページ（ベース: Figma 実績・試合結果 1030:334） */
export default function ResultsPage() {
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
					<ResultSection title="実績" moreHref={moreHref}>
						<AchievementCarousel items={achievements} />
					</ResultSection>
					<ResultSection title="試合風景" moreHref={moreHref}>
						<StaggeredGallery photos={matchPhotos} />
					</ResultSection>
					<ResultSection title="選手たちの名場面集" moreHref={moreHref}>
						<PeekCarousel photos={highlightPhotos} />
					</ResultSection>
					<ResultSection title="メディア情報" moreHref={moreHref}>
						<MediaList items={mediaItems} />
					</ResultSection>
				</div>
			</main>
		</PageShell>
	);
}
