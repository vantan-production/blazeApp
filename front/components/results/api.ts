import { API_BASE_URL } from "@/lib/apiClient";
import type { Achievement, MediaItem, Photo } from "./data";

// 画像はS3の署名付きURL（有効期限1時間。back/src/db/s3.ts）で返ってくるため、
// 期限切れのURLを配らないよう再取得間隔はそれより十分短くする
const REVALIDATE_SECONDS = 300;

/** 画像が未登録の実績に出す代替画像 */
const ACHIEVEMENT_FALLBACK_IMAGE = "/images/photo-placeholder.png";

/** 試合風景セクションに並べる枚数（Figma: gallery 1145:381 は3枚） */
const MATCH_PHOTO_COUNT = 3;

type ListResponse<T> = { success: boolean; data: T[] };

type AchievementResponse = {
	id: string;
	title: string;
	body: string;
	img_url: string | null;
};

type GameResponse = {
	id: string;
	images: { id: string; url: string }[];
};

type MediaResponse = {
	id: string;
	title: string;
	created_at: string;
	img_url: string | null;
};

/**
 * 公開一覧APIを取得する。backが落ちていてもページ全体をエラーにせず、
 * 各セクションを空表示にするため失敗時は空配列を返す
 */
async function fetchList<T>(endpoint: string): Promise<T[]> {
	try {
		const res = await fetch(`${API_BASE_URL}${endpoint}`, {
			next: { revalidate: REVALIDATE_SECONDS },
		});
		if (!res.ok) return [];
		const body = (await res.json()) as ListResponse<T>;
		return Array.isArray(body.data) ? body.data : [];
	} catch {
		return [];
	}
}

/** 実績一覧（GET /api/achievement。新しい順） */
export async function getAchievements(): Promise<Achievement[]> {
	const items = await fetchList<AchievementResponse>("/api/achievement");
	return items.map((item) => ({
		id: item.id,
		imageSrc: item.img_url ?? ACHIEVEMENT_FALLBACK_IMAGE,
		title: item.title,
	}));
}

/**
 * 試合風景（GET /api/gameImg。新しい投稿順）。
 * 未ログインでは掲載同意済み（approved）の画像だけが返るので、そのまま表示してよい
 */
export async function getMatchPhotos(): Promise<Photo[]> {
	const games = await fetchList<GameResponse>("/api/gameImg");
	return games
		.flatMap((game) => game.images ?? [])
		.slice(0, MATCH_PHOTO_COUNT)
		.map((image) => ({ id: image.id, src: image.url, alt: "試合風景" }));
}

// 掲載日はサーバーのタイムゾーンに依らず日本時間で表示する（例: 2023/5/6）
const mediaDateFormat = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "numeric",
	day: "numeric",
});

/** メディア情報（GET /api/media。新しい順） */
export async function getMediaItems(): Promise<MediaItem[]> {
	const items = await fetchList<MediaResponse>("/api/media");
	return items.map((item) => ({
		id: item.id,
		date: mediaDateFormat.format(new Date(item.created_at)),
		dateTime: item.created_at,
		title: item.title,
		imageSrc: item.img_url ?? undefined,
	}));
}
