import type { Metadata } from "next";
import { getMatchResultsPage } from "@/components/results/api";
import { LastResultCard } from "@/components/results/LastResultCard";
import { ResultsListLayout } from "@/components/results/ResultsListLayout";
import {
	pageHref,
	parsePageParam,
	redirectIfPageOutOfRange,
} from "@/lib/pagination";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
	title: "試合結果 | 西尾ブレイズ",
};

type Props = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** 試合結果の履歴（?page=N。試合日の新しい順）。Figmaにデザインが無いため、前回の試合結果のカードを縦に並べる */
export default async function MatchResultsPage({ searchParams }: Props) {
	// 取得より先に searchParams を読み、ページをリクエストごとの動的レンダリングにする
	const page = parsePageParam((await searchParams).page);
	const { items, pagination } = await getMatchResultsPage(page);
	redirectIfPageOutOfRange(page, pagination, (last) =>
		pageHref(routes.resultsMatches, last),
	);

	return (
		<ResultsListLayout
			title="試合結果"
			pathname={routes.resultsMatches}
			pagination={pagination}
			isEmpty={items.length === 0}
			emptyMessage="試合結果は準備中です"
		>
			<ul className="flex w-full flex-col gap-8">
				{items.map(({ id, ...match }) => (
					<li key={id}>
						<LastResultCard {...match} />
					</li>
				))}
			</ul>
		</ResultsListLayout>
	);
}
