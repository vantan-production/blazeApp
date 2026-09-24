"use client";

import { useMemo, useState } from "react";
import { NewsCard } from "@/components/ui/NewsCard";
import { SortableHeading } from "@/components/ui/SortableHeading";
import {
	formatNewsDate,
	type NewsItem,
	newsDetailPath,
	type SortOrder,
	sortNewsByDate,
} from "@/lib/news";
import { Pagination } from "./Pagination";

/** 1ページあたりの表示件数（Figma: 2134:1026 のカード数） */
const PAGE_SIZE = 10;

type Props = {
	items: NewsItem[];
};

/** 並び替えボタン＋ニュースカード一覧＋ページ送り */
export function NewsList({ items }: Props) {
	const [order, setOrder] = useState<SortOrder>("desc");
	const [page, setPage] = useState(1);

	const sorted = useMemo(() => sortNewsByDate(items, order), [items, order]);
	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const toggleOrder = () => {
		setOrder((prev) => (prev === "desc" ? "asc" : "desc"));
		setPage(1);
	};

	const changePage = (next: number) => {
		setPage(next);
		window.scrollTo({ top: 0 });
	};

	return (
		<>
			<div className="px-5 py-5">
				<SortableHeading
					title="ニュース"
					titleAs="h1"
					align="center"
					order={order}
					onSort={toggleOrder}
				/>
				<p className="sr-only" aria-live="polite">
					{order === "desc" ? "新しい順" : "古い順"}に並んでいます
				</p>
			</div>
			<div className="flex flex-col items-center gap-4 px-6 pb-6">
				<ul className="flex w-full flex-col gap-4">
					{pageItems.map((news) => (
						<li key={news.id}>
							<NewsCard
								href={newsDetailPath(news.id)}
								title={news.title}
								date={formatNewsDate(news.publishedAt)}
								imageSrc={news.imageSrc}
							/>
						</li>
					))}
				</ul>
				<Pagination
					currentPage={page}
					totalPages={totalPages}
					onChange={changePage}
				/>
			</div>
		</>
	);
}
