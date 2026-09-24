import { NewsListItem } from "@/components/ui/NewsListItem";
import { API_BASE_URL } from "@/lib/apiClient";
import { routes } from "@/lib/routes";

/** トップに並べるお知らせの件数（Figma: トップページ 978:348 の行数） */
const LATEST_NEWS_COUNT = 3;

/** GET /api/news-post の1件のうち、トップで使う項目だけ（back/src/news/getAll.ts） */
type NewsApiItem = {
	id: string;
	title: string;
	created_at: string;
};

type NewsListResponse = {
	success: boolean;
	data: NewsApiItem[];
};

const jstDateFormatter = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

/**
 * 公開ニュースの新しい順・先頭ページから数件取る。
 * トップは閲覧が多く画像URL（署名付き・期限あり）も使わないため、毎回ではなく60秒ごとに取り直す。
 * back が落ちていてもトップ全体を落とさないよう、失敗時は空配列にする
 */
async function fetchLatestNews(): Promise<NewsApiItem[]> {
	try {
		const res = await fetch(`${API_BASE_URL}/api/news-post?page=1`, {
			next: { revalidate: 60 },
		});
		if (!res.ok) return [];
		const body = (await res.json()) as NewsListResponse;
		return body.data.slice(0, LATEST_NEWS_COUNT);
	} catch (error) {
		console.error(error);
		return [];
	}
}

/** トップページの「お知らせ」欄 */
export async function LatestNewsSection() {
	const items = await fetchLatestNews();

	return (
		<section className="flex w-full flex-col gap-4">
			<h2 className="px-[10px] pt-[10px] pb-5 text-center text-[22px] leading-[22px] tracking-[1.5px] text-brand-white">
				お知らせ
			</h2>
			{items.length === 0 ? (
				<p className="text-center text-[14px] text-brand-white">
					お知らせはまだありません
				</p>
			) : (
				<ul className="flex flex-col gap-4">
					{items.map((item) => (
						<NewsListItem
							key={item.id}
							// 詳細ページ未作成のためリンク先は一覧ページ
							href={routes.news}
							// サーバー(UTC)で整形すると日本時間の深夜投稿が前日になるため、JSTで "2025/10/26" 形式にする
							date={jstDateFormatter.format(new Date(item.created_at))}
							title={item.title}
						/>
					))}
				</ul>
			)}
		</section>
	);
}
