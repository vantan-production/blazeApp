import { fetchPaginatedList } from "@/lib/pagination";
import type { GalleryPhoto } from "./ActivityGallery";

/** トップの活動写真に並べる最大枚数 */
const LATEST_PHOTO_COUNT = 5;

// 画像はS3の署名付きURL（有効期限1時間。back/src/db/s3.ts）で返ってくるため、
// 期限切れのURLを配らないよう再取得間隔はそれより十分短くする（components/results/api.ts と同じ）
const FETCH_INIT: RequestInit = { next: { revalidate: 300 } };

/** 一覧APIの1件のうち、ここで使う項目だけ（ニュース・メディア・実績はメイン画像を img_url で返す） */
type ImagePostResponse = {
	id: string;
	title: string;
	img_url: string | null;
	created_at: string;
};

/** GET /api/gameImg の1件。試合風景にはタイトルが無く、写真は images に並ぶ */
type GameResponse = {
	id: string;
	images: { id: string; url: string }[];
	created_at: string;
};

type PhotoCandidate = GalleryPhoto & { createdAt: string };

/**
 * サイトに投稿された写真（ニュース・メディア情報・実績・試合風景）を投稿の新しい順に数枚取る。
 * どの一覧APIも新しい順に並んでいるため、各先頭ページ（10件）を集めて並べ直す。
 * 画像の無い投稿が続くと2ページ目以降の写真は拾えないが、トップに数枚出すには足りる。
 * 1つの投稿から何枚も並ばないよう、投稿ごとにメイン画像（試合風景は先頭の写真）1枚だけを使う。
 * サーバーからの fetch は Cookie を送らない未ログイン扱いのため、back は公開中の投稿・
 * 掲載同意済み（approved）の試合風景写真だけを返す（下書き・承認待ち・関係者限定は含まれない。
 * 実績には公開状態が無く全件公開）。
 * 取得に失敗した一覧は fetchPaginatedList が空にするので、残りの一覧の写真だけで表示する
 */
export async function getLatestPhotos(): Promise<GalleryPhoto[]> {
	const [news, media, achievements, games] = await Promise.all([
		fetchPaginatedList<ImagePostResponse>(
			"/api/news-post",
			{ page: 1 },
			FETCH_INIT,
		),
		fetchPaginatedList<ImagePostResponse>(
			"/api/media",
			{ page: 1 },
			FETCH_INIT,
		),
		fetchPaginatedList<ImagePostResponse>(
			"/api/achievement",
			{ page: 1 },
			FETCH_INIT,
		),
		fetchPaginatedList<GameResponse>("/api/gameImg", { page: 1 }, FETCH_INIT),
	]);

	const fromPosts = (items: ImagePostResponse[]): PhotoCandidate[] =>
		items.flatMap((item) =>
			item.img_url
				? [
						{
							src: item.img_url,
							alt: item.title,
							createdAt: item.created_at,
						},
					]
				: [],
		);

	const candidates: PhotoCandidate[] = [
		...fromPosts(news.items),
		...fromPosts(media.items),
		...fromPosts(achievements.items),
		...games.items.flatMap((game) => {
			const first = game.images?.[0];
			return first
				? [
						{
							src: first.url,
							alt: "試合風景",
							createdAt: game.created_at,
						},
					]
				: [];
		}),
	];

	return candidates
		.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)
		.slice(0, LATEST_PHOTO_COUNT)
		.map(({ src, alt }) => ({ src, alt }));
}
