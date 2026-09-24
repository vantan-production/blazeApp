import type { Metadata } from "next";
import { getMatchPostsPage } from "@/components/results/api";
import { ResultsListLayout } from "@/components/results/ResultsListLayout";
import { FramedImage } from "@/components/ui/FramedImage";
import {
	pageHref,
	parsePageParam,
	redirectIfPageOutOfRange,
} from "@/lib/pagination";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
	title: "試合風景 | 西尾ブレイズ",
};

type Props = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/**
 * 試合風景の一覧（?page=N）。1投稿ごとに投稿日と写真を2列のグリッドで並べる。
 * back の試合風景にはタイトルが無いため、見出しは投稿日にする
 */
export default async function MatchPhotosPage({ searchParams }: Props) {
	// 取得より先に searchParams を読み、ページをリクエストごとの動的レンダリングにする
	const page = parsePageParam((await searchParams).page);
	const { items, pagination } = await getMatchPostsPage(page);
	redirectIfPageOutOfRange(page, pagination, (last) =>
		pageHref(routes.resultsMatchPhotos, last),
	);

	return (
		<ResultsListLayout
			title="試合風景"
			pathname={routes.resultsMatchPhotos}
			pagination={pagination}
			isEmpty={items.length === 0}
			emptyMessage="試合風景は準備中です"
		>
			<ul className="flex w-full flex-col gap-8">
				{items.map((post) => (
					<li key={post.id} className="flex flex-col gap-3">
						<time
							dateTime={post.dateTime}
							className="font-inter text-[14px] font-bold tracking-[1px] text-brand-yellow"
						>
							{post.date}
						</time>
						<ul className="grid grid-cols-2 gap-3">
							{post.photos.map((photo) => (
								<li key={photo.id}>
									<FramedImage
										src={photo.src}
										alt={photo.alt}
										width={240}
										height={160}
									/>
								</li>
							))}
						</ul>
					</li>
				))}
			</ul>
		</ResultsListLayout>
	);
}
