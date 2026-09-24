import type { Metadata } from "next";
import { getMediaPage } from "@/components/results/api";
import { MediaList } from "@/components/results/MediaList";
import { ResultsListLayout } from "@/components/results/ResultsListLayout";
import {
	pageHref,
	parsePageParam,
	redirectIfPageOutOfRange,
} from "@/lib/pagination";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
	title: "メディア情報 | 西尾ブレイズ",
};

type Props = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** メディア情報の一覧（?page=N。新しい順） */
export default async function MediaPage({ searchParams }: Props) {
	// 取得より先に searchParams を読み、ページをリクエストごとの動的レンダリングにする
	const page = parsePageParam((await searchParams).page);
	const { items, pagination } = await getMediaPage(page);
	redirectIfPageOutOfRange(page, pagination, (last) =>
		pageHref(routes.resultsMedia, last),
	);

	return (
		<ResultsListLayout
			title="メディア情報"
			pathname={routes.resultsMedia}
			pagination={pagination}
			isEmpty={items.length === 0}
			emptyMessage="メディア情報は準備中です"
		>
			<MediaList items={items} />
		</ResultsListLayout>
	);
}
