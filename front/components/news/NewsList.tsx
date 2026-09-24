import { NewsCard } from "@/components/ui/NewsCard";
import { Pagination } from "@/components/ui/Pagination";
import { SortableHeading } from "@/components/ui/SortableHeading";
import {
	formatNewsDate,
	type NewsItem,
	newsDetailPath,
	newsListHref,
	newsListParams,
	type SortOrder,
} from "@/lib/news";
import type { PageInfo } from "@/lib/pagination";
import { routes } from "@/lib/routes";

type Props = {
	/** 表示中のページの記事（backで並び替え・ページ分け済み） */
	items: NewsItem[];
	pagination: PageInfo;
	order: SortOrder;
};

/** 並び替えリンク＋ニュースカード一覧＋ページ送り */
export function NewsList({ items, pagination, order }: Props) {
	// 並び順を変えると1ページ目の中身が別物になるため、ページは1に戻す
	const toggledOrder = order === "desc" ? "asc" : "desc";
	const sortHref = newsListHref(1, toggledOrder);

	return (
		<>
			<div className="px-5 py-5">
				<SortableHeading
					title="ニュース"
					titleAs="h1"
					align="center"
					order={order}
					sortHref={sortHref}
				/>
				<p className="sr-only">
					{order === "desc" ? "新しい順" : "古い順"}に並んでいます
				</p>
			</div>
			<div className="flex flex-col items-center gap-4 px-6 pb-6">
				{/* back未接続や記事0件のときに、空白だけのページにならないようにする */}
				{items.length === 0 && (
					<p className="py-10 text-[14px] text-brand-white">
						ニュースはまだありません
					</p>
				)}
				<ul className="flex w-full flex-col gap-4">
					{items.map((news) => (
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
					currentPage={pagination.page}
					totalPages={pagination.totalPages}
					pathname={routes.news}
					params={newsListParams(order)}
				/>
			</div>
		</>
	);
}
