import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { API_BASE_URL } from "./apiClient";
import { fetchPaginatedList, type Paginated, pageHref } from "./pagination";
import { routes } from "./routes";

/** ニュース1件。APIのレスポンス（NewsApiItem）を画面で使う形に変換したもの */
export type NewsItem = {
	id: string;
	title: string;
	/** 公開日（YYYY-MM-DD、日本時間） */
	publishedAt: string;
	/** カテゴリー。back側は自由入力で未設定もあり得る */
	tag: string | null;
	/** 一覧のサムネイル */
	imageSrc: string;
	/** 詳細ページの写真（1枚以上） */
	images: string[];
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
	/** 詳細APIだけが返す、記事に添付された写真（署名付きURL） */
	images?: { id: string; url: string }[];
	created_at: string;
};

type NewsDetailResponse = {
	success: boolean;
	data: NewsApiItem;
};

// 画像が未登録の記事でもカードの見た目が崩れないよう、サイトのロゴで代用する
const FALLBACK_IMAGE = "/images/logo.png";

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
	const imageSrc = item.img_url ?? FALLBACK_IMAGE;
	// 詳細ページは写真が1枚以上ある前提のため、添付写真が無ければメイン画像（無ければロゴ）1枚にする
	const attached = (item.images ?? []).map((image) => image.url);
	return {
		id: item.id,
		title: item.title,
		// サーバー(UTC)で日付を切り出すと日本時間の深夜投稿が前日扱いになるため、JSTで整形する
		publishedAt: jstDateFormatter.format(new Date(item.created_at)),
		tag: item.category,
		imageSrc,
		images: attached.length > 0 ? attached : [imageSrc],
		body: item.body,
	};
}

/** クエリの ?order= を並び順にする。未指定・不正な値は新しい順（back の既定と同じ） */
export function parseSortOrder(
	value: string | string[] | undefined,
): SortOrder {
	return (Array.isArray(value) ? value[0] : value) === "asc" ? "asc" : "desc";
}

/** 一覧の並び順をURLに載せるときのクエリ。既定の新しい順は付けずにURLを短く保つ */
export function newsListParams(order: SortOrder) {
	return { order: order === "asc" ? "asc" : undefined };
}

/** ニュース一覧の指定ページ・並び順のURL */
export function newsListHref(page: number, order: SortOrder): string {
	return pageHref(routes.news, page, newsListParams(order));
}

/**
 * ニュース一覧を1ページ分（back側で10件固定）取得する。並び替え・ページ送りはbackに任せる。
 * 画像URLは署名付きで1時間しか有効でないため、キャッシュせず毎回取得する。
 * backに繋がらない場合は空の結果（ページは空表示にする）
 */
export async function fetchNewsPage(
	page: number,
	order: SortOrder,
): Promise<Paginated<NewsItem>> {
	const result = await fetchPaginatedList<NewsApiItem>(
		"/api/news-post",
		{ page, order },
		{ cache: "no-store" },
	);
	return { ...result, items: result.items.map(toNewsItem) };
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
			// notFound や動的レンダリングの判定など、Next.js内部の例外は握りつぶさない
			unstable_rethrow(error);
			console.error(error);
			return undefined;
		}
	},
);

/** "2026-04-26" → "2026.4.26"（Figmaの表記に合わせる） */
export function formatNewsDate(publishedAt: string): string {
	const [y, m, d] = publishedAt.split("-").map(Number);
	return `${y}.${m}.${d}`;
}

export function newsDetailPath(id: string): string {
	return `${routes.news}/${id}`;
}
