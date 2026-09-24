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
import { LastResultCard } from "@/components/results/LastResultCard";
import { MediaList } from "@/components/results/MediaList";
import { PeekCarousel } from "@/components/results/PeekCarousel";
import { ResultSection } from "@/components/results/ResultSection";
import { StaggeredGallery } from "@/components/results/StaggeredGallery";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
	title: "実績・試合結果 | 西尾ブレイズ",
};

// TODO: 各「もっと見る」の一覧ページが決まったら遷移先を差し替える
const moreHref = routes.news;

/** 未登録・API停止中でセクションが空のときの表示 */
function EmptyNote({ children }: { children: React.ReactNode }) {
	return <p className="py-5 text-center text-[16px]">{children}</p>;
}

/** 実績・試合結果ページ（Figma: 実績・試合結果 1030:334） */
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
				<div className="flex w-full items-center justify-center border-y-2 border-brand-white px-5 py-6">
					<h1 className="text-[24px]">実績・試合結果</h1>
				</div>
				<div className="flex w-full flex-col px-[clamp(16px,5.97vw,24px)]">
					<LastResultCard {...lastMatch} />
					<ResultSection title="チーム目標">
						<p className="w-full border-2 border-brand-white px-3 py-5 text-center text-[18px] leading-[22px] tracking-[1px] text-balance">
							{teamGoal}
						</p>
					</ResultSection>
					{/* 空のときは遷移先にも何も無いので「もっと見る」を出さない */}
					<ResultSection
						title="実績"
						moreHref={achievements.length > 0 ? moreHref : undefined}
					>
						{achievements.length > 0 ? (
							<AchievementCarousel items={achievements} />
						) : (
							<EmptyNote>実績は準備中です</EmptyNote>
						)}
					</ResultSection>
					<ResultSection
						title="試合風景"
						moreHref={matchPhotos.length > 0 ? moreHref : undefined}
					>
						{matchPhotos.length > 0 ? (
							<StaggeredGallery photos={matchPhotos} />
						) : (
							<EmptyNote>試合風景は準備中です</EmptyNote>
						)}
					</ResultSection>
					<ResultSection title="選手たちの名場面集" moreHref={moreHref}>
						<PeekCarousel photos={highlightPhotos} />
					</ResultSection>
					<ResultSection
						title="メディア情報"
						moreHref={mediaItems.length > 0 ? moreHref : undefined}
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
