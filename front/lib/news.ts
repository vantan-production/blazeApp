import { cache } from "react";
import { API_BASE_URL } from "./apiClient";
import { routes } from "./routes";

/** ニュース1件。APIのレスポンス（NewsApiItem）を画面で使う形に変換したもの */
export type NewsItem = {
	id: string;
	title: string;
	/** 公開日（YYYY-MM-DD、日本時間） */
	publishedAt: string;
	/** カテゴリー。back側は自由入力で未設定もあり得る */
	tag: string | null;
	imageSrc: string;
	body: string;
};

export type SortOrder = "desc" | "asc";

/** GET /api/news-post(/:id) が返すニュース1件（back/src/news/getAll.ts・getById.ts） */
type NewsApiItem = {
	id: string;
	title: string;
	body: string;
	category: string | null;
	/** S3の署名付きURL（1時間で失効）。画像なしなら null */
	img_url: string | null;
	created_at: string;
};

type NewsListResponse = {
	success: boolean;
	data: NewsApiItem[];
	// 旧版のbackはページネーション無しで全件を返すため、無い場合も考慮する
	pagination?: { page: number; totalPages: number };
};

type NewsDetailResponse = {
	success: boolean;
	data: NewsApiItem;
};

// 画像が未登録の記事でもカードの見た目が崩れないよう、サイトのロゴで代用する
const FALLBACK_IMAGE = "/images/logo.png";

// back側は1ページ10件固定。一覧画面は並び替え・ページ送りを画面側で行うため全件取る必要があるが、
// 想定外のレスポンスで無限ループしないよう取得ページ数に上限を設ける
const MAX_PAGES = 50;

// back の id は UUID。形式外の値を投げると back が 500 を返すため、事前に弾いて 404 扱いにする
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const jstDateFormatter = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

function toNewsItem(item: NewsApiItem): NewsItem {
	return {
		id: item.id,
		title: item.title,
		// サーバー(UTC)で日付を切り出すと日本時間の深夜投稿が前日扱いになるため、JSTで整形する
		publishedAt: jstDateFormatter.format(new Date(item.created_at)),
		tag: item.category,
		imageSrc: item.img_url ?? FALLBACK_IMAGE,
		body: item.body,
	};
}

// 画像URLは署名付きで1時間しか有効でないため、キャッシュせず毎回取得する
async function fetchNewsPage(page: number): Promise<NewsListResponse> {
	const res = await fetch(`${API_BASE_URL}/api/news-post?page=${page}`, {
		cache: "no-store",
	});
	if (!res.ok)
		throw new Error(`ニュース一覧の取得に失敗しました（${res.status}）`);
	return (await res.json()) as NewsListResponse;
}

/** ニュース一覧を全件取得する。backに繋がらない場合は空配列（ページは空表示にする） */
export async function fetchNews(): Promise<NewsItem[]> {
	try {
		const items: NewsApiItem[] = [];
		for (let page = 1; page <= MAX_PAGES; page++) {
			const body = await fetchNewsPage(page);
			items.push(...body.data);
			const totalPages = body.pagination?.totalPages;
			if (totalPages === undefined || page >= totalPages) break;
		}
		return items.map(toNewsItem);
	} catch (error) {
		console.error(error);
		return [];
	}
}

/**
 * IDを指定してニュースを1件取得する。見つからなければ undefined。
 * generateMetadata とページ本体の両方から呼ばれるため、同一リクエスト内では cache で1回にまとめる
 */
export const fetchNewsById = cache(
	async (id: string): Promise<NewsItem | undefined> => {
		if (!UUID_PATTERN.test(id)) return undefined;
		try {
			const res = await fetch(
				`${API_BASE_URL}/api/news-post/${encodeURIComponent(id)}`,
				{ cache: "no-store" },
			);
			if (!res.ok) return undefined;
			const body = (await res.json()) as NewsDetailResponse;
			return toNewsItem(body.data);
		} catch (error) {
			console.error(error);
			return undefined;
		}
	},
);

/** 公開日で並び替えた新しい配列を返す */
export function sortNewsByDate(
	items: readonly NewsItem[],
	order: SortOrder,
): NewsItem[] {
	const sign = order === "desc" ? -1 : 1;
	return [...items].sort(
		(a, b) => sign * a.publishedAt.localeCompare(b.publishedAt),
	);
}

/** "2026-04-26" → "2026.4.26"（Figmaの表記に合わせる） */
export function formatNewsDate(publishedAt: string): string {
	const [y, m, d] = publishedAt.split("-").map(Number);
	return `${y}.${m}.${d}`;
}

export function newsDetailPath(id: string): string {
	return `${routes.news}/${id}`;
}
