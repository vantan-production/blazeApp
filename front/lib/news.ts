import type { TagKind } from "@/components/ui/Tag";
import { routes } from "./routes";

/** ニュース1件。将来はAPIのレスポンスをこの型に変換して使う */
export type NewsItem = {
	id: string;
	title: string;
	/** 公開日（YYYY-MM-DD） */
	publishedAt: string;
	tag: TagKind;
	/** 一覧のサムネイル */
	imageSrc: string;
	/** 詳細ページの写真（1枚以上） */
	images: string[];
	body: string;
};

export type SortOrder = "desc" | "asc";

const sampleTitles = [
	"春の小学生ドッジボール杯\n成績ベスト16！！！",
	"西尾市ライオンズクラブ杯",
	"体験会を開催しました",
	"地元テレビで活動が紹介されました",
] as const;

const sampleTags: TagKind[] = ["tournaments", "event", "join trial", "media"];

const sampleImages = [
	"/images/news-card-sample.jpg",
	"/images/top-hero.jpg",
	"/images/top-about.png",
	"/images/card-bg.png",
	"/images/top-hero-overlay.png",
	"/images/news-card-sample.jpg",
];

// TODO: API 実装後はダミーデータを削除し、fetchNews / fetchNewsById の中身を API 呼び出しに置き換える
const dummyNews: NewsItem[] = Array.from({ length: 24 }, (_, i) => {
	const date = new Date(Date.UTC(2026, 3, 26 - i * 7));
	return {
		id: String(i + 1),
		title: sampleTitles[i % sampleTitles.length],
		publishedAt: date.toISOString().slice(0, 10),
		tag: sampleTags[i % sampleTags.length],
		imageSrc: "/images/news-card-sample.jpg",
		// 枚数ごとの表示を確認できるよう、1枚・3枚・6枚の記事を混ぜておく
		images: sampleImages.slice(0, [6, 1, 3, 1][i % 4]),
		body: "あああああああああああああああああああああああああああああああああああああああああああああああああああああああああああ",
	};
});

/** ニュース一覧を取得する */
export async function fetchNews(): Promise<NewsItem[]> {
	return dummyNews;
}

/** IDを指定してニュースを1件取得する。見つからなければ undefined */
export async function fetchNewsById(id: string): Promise<NewsItem | undefined> {
	return dummyNews.find((news) => news.id === id);
}

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
