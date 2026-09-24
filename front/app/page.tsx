import { PageShell } from "@/components/layout/PageShell";
import { ActivityGallery } from "@/components/top/ActivityGallery";
import { HeroSection } from "@/components/top/HeroSection";
import { LatestNewsSection } from "@/components/top/LatestNewsSection";
import { PageLinksSection } from "@/components/top/PageLinksSection";
import { ContentPanel } from "@/components/ui/ContentPanel";
import { PillHeading } from "@/components/ui/PillHeading";
import { TrialBanner } from "@/components/ui/TrialBanner";

// TODO: 活動写真が用意できたら差し替える（今はFigmaのプレースホルダー画像）
const galleryPhotos = [1, 2, 3].map((n) => ({
	src: "/images/top-about.png",
	alt: `西尾ブレイズの活動写真 ${n}`,
}));

/** トップページ（Figma: トップページ 978:348） */
export default function Home() {
	return (
		<PageShell offsetHeader={false}>
			<HeroSection />

			<div className="px-[10px] py-4">
				<TrialBanner />
			</div>

			<main className="flex flex-1 flex-col items-center gap-8 px-6 pb-10">
				<LatestNewsSection />

				<section className="flex w-full flex-col items-center gap-8">
					<PillHeading>西尾ブレイズって？</PillHeading>

					<ContentPanel title="西尾ブレイズについて">
						<p className="text-center">
							創部19年目、愛知県ドッジボール協会所属のクラブチームです。小学1~6年生の男子女子が全国大会優勝を目指して頑張っています！
						</p>
					</ContentPanel>
					{/* 画像は後に追加します */}
					<ActivityGallery photos={galleryPhotos} />
				</section>

				<PageLinksSection />
			</main>
		</PageShell>
	);
}
