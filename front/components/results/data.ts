/** 前回の試合結果（Figma: last time results 1031:551）。API接続までの仮データ */
export const lastMatch = {
	ourScore: 9,
	opponentScore: 8,
	ourTeam: "西尾ブレイズ",
	opponentTeam: "元江別レッド・\nソルジャー",
};

export const teamGoal = "勝利を目指して挑戦し続けるチームへ";

export type Achievement = { id: string; imageSrc: string; title: string };

/** 実績（Figma: achievements 1360:343） */
export const achievements: Achievement[] = [
	{
		id: "spring-28",
		imageSrc: "/images/results-trophy.jpg",
		title: "第28回春の全国\n小学生\nドッジボール\n選手権\n全国大会ベスト８",
	},
];

export type Photo = { id: string; src: string; alt: string };

/** 試合風景（Figma: gallery 1145:381）。写真が用意できるまでは仮画像 */
export const matchPhotos: Photo[] = [
	{ id: "match-1", src: "/images/photo-placeholder.png", alt: "試合風景" },
	{ id: "match-2", src: "/images/photo-placeholder.png", alt: "試合風景" },
	{ id: "match-3", src: "/images/photo-placeholder.png", alt: "試合風景" },
];

/** 選手たちの名場面集（Figma: gallery 1250:344）。写真が用意できるまでは仮画像 */
export const highlightPhotos: Photo[] = [
	{ id: "highlight-1", src: "/images/photo-placeholder.png", alt: "名場面" },
	{ id: "highlight-2", src: "/images/photo-placeholder.png", alt: "名場面" },
	{ id: "highlight-3", src: "/images/photo-placeholder.png", alt: "名場面" },
];

export type MediaItem = {
	id: string;
	date: string;
	title: string;
	/** 掲載画像。無い場合（動画など）は白い枠を表示する */
	imageSrc?: string;
};

/** メディア情報（Figma: gallery 1250:357） */
export const mediaItems: MediaItem[] = [
	{
		id: "youtube-2023-02-21",
		date: "2023/2/21",
		// TODO: 紹介動画のURLが決まったら埋め込みにする
		title: "youtubeチャンネルの〇〇で紹介されました",
	},
	{
		id: "aisan-2023-05-06",
		date: "2023/5/6",
		title: "愛三時報で取り上げられました",
		imageSrc: "/images/results-media-newspaper.jpg",
	},
];
