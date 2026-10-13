import { MATCH_RESULTS_CACHE_TAG } from "@/lib/cacheTags";
import { fetchPaginatedList, type Paginated } from "@/lib/pagination";
import type {
	Achievement,
	LastMatch,
	MatchPost,
	MediaItem,
	Photo,
} from "./data";

// 画像はS3の署名付きURL（有効期限1時間。back/src/db/s3.ts）で返ってくるため、
// 期限切れのURLを配らないよう再取得間隔はそれより十分短くする
const FETCH_INIT: RequestInit = { next: { revalidate: 300 } };

// 試合結果は画像が無いので署名付きURLの期限は気にしなくてよい。管理画面で変えたときに
// lib/admin/revalidateMatchResults.ts がこのタグでキャッシュを捨て、すぐ最新を出す
const MATCH_RESULTS_FETCH_INIT: RequestInit = {
	next: { revalidate: 300, tags: [MATCH_RESULTS_CACHE_TAG] },
};

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
};

type GameResponse = {
	id: string;
	images: { id: string; url: string }[];
	created_at: string;
};

type MatchResultResponse = {
	id: string;
	tournament_name: string;
	tournament_result: string | null;
	/** 試合日（YYYY-MM-DD） */
	played_on: string;
	opponent_name: string | null;
	sets: { our_score: number; opponent_score: number }[];
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

/**
 * 前回の試合結果（GET /api/match-results の先頭1件。試合日の新しい順に並んでいる）。
 * まだ1件も無ければ null
 */
export async function getLastMatch(): Promise<LastMatch | null> {
	const { items } = await fetchPaginatedList<MatchResultResponse>(
		"/api/match-results",
		{ page: 1 },
		MATCH_RESULTS_FETCH_INIT,
	);
	const latest = items[0];
	if (!latest) return null;

	// 試合日は日付だけなので、タイムゾーンの変換をせずにそのまま表示する
	const [y, m, d] = latest.played_on.split("-").map(Number);
	return {
		tournamentName: latest.tournament_name,
		tournamentResult: latest.tournament_result ?? undefined,
		date: `${y}/${m}/${d}`,
		dateTime: latest.played_on,
		opponentTeam: latest.opponent_name ?? undefined,
		sets: latest.sets.map((set) => ({
			ourScore: set.our_score,
			opponentScore: set.opponent_score,
		})),
	};
}
