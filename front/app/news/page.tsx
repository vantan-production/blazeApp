import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { NewsList } from "@/components/news/NewsList";
import { fetchNews } from "@/lib/news";

export const metadata: Metadata = {
	title: "ニュース | 西尾ブレイズ",
};

/** ニュース一覧（Figma: ニュース 2134:1026） */
export default async function NewsPage() {
	const news = await fetchNews();

	return (
		<PageShell>
			<main className="flex flex-col">
				<h1 className="sr-only">ニュース</h1>
				<NewsList items={news} />
			</main>
		</PageShell>
	);
}
