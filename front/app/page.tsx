import { Copyright } from "@/components/layout/Copyright";
import { PageShell } from "@/components/layout/PageShell";
import { HeroSection } from "@/components/top/HeroSection";
import { ContentPanel } from "@/components/ui/ContentPanel";
import { FramedImage } from "@/components/ui/FramedImage";
import { NewsListItem } from "@/components/ui/NewsListItem";
import { PillHeading } from "@/components/ui/PillHeading";
import { TrialBanner } from "@/components/ui/TrialBanner";
import { routes } from "@/lib/routes";

// TODO: お知らせはAPIから取得する。詳細ページ未作成のためリンク先は一覧ページ
const newsItems = [
	{
		id: "1",
		date: "2025/10/26",
		title:
			"あああああああああああああああああああああああああああああああああああ",
	},
	{ id: "2", date: "2025/10/26", title: "西尾市ライオンズクラブ杯" },
	{ id: "3", date: "2025/10/26", title: "西尾市ライオンズクラブ杯" },
];

/** トップページ（Figma: トップページ 978:348） */
export default function Home() {
	return (
		<PageShell offsetHeader={false}>
			<HeroSection />

			<div className="px-[10px] py-4">
				<TrialBanner />
			</div>

			<main className="flex flex-1 flex-col items-center gap-8 px-6 pb-10">
				<section className="flex w-full flex-col gap-4">
					<h2 className="px-[10px] pt-[10px] pb-5 text-center text-[22px] leading-[22px] tracking-[1.5px] text-brand-white">
						お知らせ
					</h2>
					<ul className="flex flex-col gap-4">
						{newsItems.map((item) => (
							<NewsListItem
								key={item.id}
								href={routes.news}
								date={item.date}
								title={item.title}
							/>
						))}
					</ul>
				</section>

				<section className="flex w-full flex-col items-center gap-8">
					<PillHeading>西尾ブレイズって？</PillHeading>
					<ContentPanel title="西尾ブレイズについて">
						<p className="text-center">
							創部19年目、愛知県ドッジボール協会所属のクラブチームです。小学1~6年生の男子女子が全国大会優勝を目指して頑張っています！
						</p>
					</ContentPanel>
					<FramedImage
						src="/images/top-about.png"
						alt="西尾ブレイズの活動写真"
					/>
				</section>

				<Copyright />
			</main>
		</PageShell>
	);
}
