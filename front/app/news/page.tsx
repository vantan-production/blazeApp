import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { NewsList } from "@/components/news/NewsList";
import { fetchNewsPage, newsListHref, parseSortOrder } from "@/lib/news";
import { parsePageParam, redirectIfPageOutOfRange } from "@/lib/pagination";

export const metadata: Metadata = {
	title: "ニュース | 西尾ブレイズ",
};

type Props = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** ニュース一覧（Figma: ニュース 2134:1026）。表示ページと並び順はURL（?page=N&order=asc）で持つ */
export default async function NewsPage({ searchParams }: Props) {
	// 取得より先に searchParams を読み、ページをリクエストごとの動的レンダリングにする
	const query = await searchParams;
	const page = parsePageParam(query.page);
	const order = parseSortOrder(query.order);

	const { items, pagination } = await fetchNewsPage(page, order);
	redirectIfPageOutOfRange(page, pagination, (last) =>
		newsListHref(last, order),
	);

	return (
		<PageShell>
			<main className="flex flex-col">
				<NewsList items={items} pagination={pagination} order={order} />
			</main>
		</PageShell>
	);
}
