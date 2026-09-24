import type { Metadata } from "next";
import { AchievementCard } from "@/components/results/AchievementCard";
import { getAchievementsPage } from "@/components/results/api";
import { ResultsListLayout } from "@/components/results/ResultsListLayout";
import {
	PAGE_SIZE,
	pageHref,
	parsePageParam,
	redirectIfPageOutOfRange,
} from "@/lib/pagination";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
	title: "実績 | 西尾ブレイズ",
};

type Props = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** 実績の一覧（?page=N）。Figmaにデザインが無いため、実績スライダーのカードを縦に並べる */
export default async function AchievementsPage({ searchParams }: Props) {
	// 取得より先に searchParams を読み、ページをリクエストごとの動的レンダリングにする
	const page = parsePageParam((await searchParams).page);
	const { items, pagination } = await getAchievementsPage(page);
	redirectIfPageOutOfRange(page, pagination, (last) =>
		pageHref(routes.resultsAchievements, last),
	);

	// 番号バッジはページをまたいで通し番号にする
	const offset = (pagination.page - 1) * PAGE_SIZE;

	return (
		<ResultsListLayout
			title="実績"
			pathname={routes.resultsAchievements}
			pagination={pagination}
			isEmpty={items.length === 0}
			emptyMessage="実績は準備中です"
		>
			<ul className="flex w-full flex-col gap-4">
				{items.map((item, i) => (
					<li key={item.id}>
						<AchievementCard
							imageSrc={item.imageSrc}
							title={item.title}
							number={offset + i + 1}
							date={item.date}
							dateTime={item.dateTime}
						/>
					</li>
				))}
			</ul>
		</ResultsListLayout>
	);
}
