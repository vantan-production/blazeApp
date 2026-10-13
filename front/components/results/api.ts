import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { API_BASE_URL } from "@/lib/apiClient";
import { fetchPaginatedList, type Paginated } from "@/lib/pagination";
import type {
	Achievement,
	AchievementDetail,
	MatchPost,
	MediaItem,
	Photo,
} from "./data";

// 画像はS3の署名付きURL（有効期限1時間。back/src/db/s3.ts）で返ってくるため、
// 期限切れのURLを配らないよう再取得間隔はそれより十分短くする
const FETCH_INIT: RequestInit = { next: { revalidate: 300 } };

/** 画像が未登録の実績に出す代替画像 */
const ACHIEVEMENT_FALLBACK_IMAGE = "/images/photo-placeholder.png";

/** 試合風景セクションに並べる枚数（Figma: gallery 1145:381 は3枚） */
const MATCH_PHOTO_COUNT = 3;

type AchievementResponse = {
	id: string;
	title: string;
	body: string;
	img_url: string | null;
	created_at: string;
	/** 詳細APIだけが返す、本文に添付された画像（署名付きURL） */
	images?: { id: string; url: string }[];
};

// back の id は UUID。形式外の値を投げると back が 404 を返すが、問い合わせ自体を省く
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type GameResponse = {
	id: string;
	images: { id: string; url: string }[];
	created_at: string;
};

type MediaResponse = {
	id: string;
	title: string;
	created_at: string;
	img_url: string | null;
};

// 日付はサーバーのタイムゾーンに依らず日本時間で表示する（例: 2023/5/6）
const dateFormat = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "numeric",
	day: "numeric",
});

function formatDate(iso: string): string {
	return dateFormat.format(new Date(iso));
}

/** 取得結果の各項目を画面用の形に変換する（ページ情報はそのまま） */
function mapItems<T, U>(
	result: Paginated<T>,
	convert: (item: T) => U,
): Paginated<U> {
	return { ...result, items: result.items.map(convert) };
}

/** 実績一覧の1ページ分（GET /api/achievement。新しい順・10件ずつ） */
export async function getAchievementsPage(
	page: number,
): Promise<Paginated<Achievement>> {
	const result = await fetchPaginatedList<AchievementResponse>(
		"/api/achievement",
		{ page },
		FETCH_INIT,
	);
	return mapItems(result, (item) => ({
		id: item.id,
		imageSrc: item.img_url ?? ACHIEVEMENT_FALLBACK_IMAGE,
		title: item.title,
		date: formatDate(item.created_at),
		dateTime: item.created_at,
	}));
}

/**
 * IDを指定して実績を1件取得する（詳細ページ用）。見つからなければ undefined。
 * 画像は署名付きURL（1時間で失効）なのでキャッシュせず毎回取得し、
 * generateMetadata とページ本体からの呼び出しは cache で1回にまとめる
 */
export const getAchievementById = cache(
	async (id: string): Promise<AchievementDetail | undefined> => {
		if (!UUID_PATTERN.test(id)) return undefined;
		try {
			const res = await fetch(
				`${API_BASE_URL}/api/achievement/${encodeURIComponent(id)}`,
				{ cache: "no-store" },
			);
			if (!res.ok) return undefined;
			const { data } = (await res.json()) as { data: AchievementResponse };
			const bodyImages = (data.images ?? []).map((image) => image.url);
			const images = data.img_url ? [data.img_url, ...bodyImages] : bodyImages;
			return {
				id: data.id,
				imageSrc: data.img_url ?? ACHIEVEMENT_FALLBACK_IMAGE,
				title: data.title,
				date: formatDate(data.created_at),
				dateTime: data.created_at,
				body: data.body,
				images: images.length > 0 ? images : [ACHIEVEMENT_FALLBACK_IMAGE],
			};
		} catch (error) {
			// notFound や動的レンダリングの判定など、Next.js内部の例外は握りつぶさない
			unstable_rethrow(error);
			console.error(error);
			return undefined;
		}
	},
);

/** 実績・試合結果ページの実績セクション用（先頭ページ） */
export async function getAchievements(): Promise<Achievement[]> {
	return (await getAchievementsPage(1)).items;
}

/**
 * 試合風景の投稿一覧の1ページ分（GET /api/gameImg。新しい投稿順・10件ずつ）。
 * 未ログインでは掲載同意済み（approved）の画像だけが返るので、そのまま表示してよい
 */
export async function getMatchPostsPage(
	page: number,
): Promise<Paginated<MatchPost>> {
	const result = await fetchPaginatedList<GameResponse>(
		"/api/gameImg",
		{ page },
		FETCH_INIT,
	);
	return mapItems(result, (game) => ({
		id: game.id,
		date: formatDate(game.created_at),
		dateTime: game.created_at,
		photos: (game.images ?? []).map((image) => ({
			id: image.id,
			src: image.url,
			alt: "試合風景",
		})),
	}));
}

/** 実績・試合結果ページの試合風景セクション用。新しい投稿から写真を数枚取り出す */
export async function getMatchPhotos(): Promise<Photo[]> {
	const { items } = await getMatchPostsPage(1);
	return items.flatMap((post) => post.photos).slice(0, MATCH_PHOTO_COUNT);
}

/** メディア情報の1ページ分（GET /api/media。新しい順・10件ずつ） */
export async function getMediaPage(
	page: number,
): Promise<Paginated<MediaItem>> {
	const result = await fetchPaginatedList<MediaResponse>(
		"/api/media",
		{ page, order: "desc" },
		FETCH_INIT,
	);
	return mapItems(result, (item) => ({
		id: item.id,
		date: formatDate(item.created_at),
		dateTime: item.created_at,
		title: item.title,
		imageSrc: item.img_url ?? undefined,
	}));
}

/** 実績・試合結果ページのメディア情報セクション用（先頭ページ） */
export async function getMediaItems(): Promise<MediaItem[]> {
	return (await getMediaPage(1)).items;
}
