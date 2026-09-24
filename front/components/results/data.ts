// 実績・試合風景・メディア情報はAPIから取得する（./api.ts）。
// ここにはbackに対応するデータが無く、静的に持つしかないものだけを置く

/**
 * 前回の試合結果（Figma: last time results 1031:551）。
 * TODO: backに試合結果（スコア・対戦相手）を持つAPIができたら接続する。
 * 実績API（/api/achievement）はタイトル・本文のみで、スコアを構造化して持っていないため仮データのまま
 */
export const lastMatch = {
	ourScore: 9,
	opponentScore: 8,
	ourTeam: "西尾ブレイズ",
	opponentTeam: "元江別レッド・\nソルジャー",
};

/** チーム目標。backに対応するデータが無いため固定文言 */
export const teamGoal = "勝利を目指して挑戦し続けるチームへ";

export type Achievement = {
	id: string;
	imageSrc: string;
	title: string;
	/** 表示用の登録日（例: 2023/5/6） */
	date: string;
	/** <time dateTime> 用のISO日時 */
	dateTime: string;
};

export type Photo = { id: string; src: string; alt: string };

/**
 * 試合風景の投稿1件。back の game にはタイトルが無いため、投稿日と写真だけを持つ
 */
export type MatchPost = {
	id: string;
	/** 表示用の投稿日（例: 2023/5/6） */
	date: string;
	/** <time dateTime> 用のISO日時 */
	dateTime: string;
	photos: Photo[];
};

/**
 * 選手たちの名場面集（Figma: gallery 1250:344）。
 * TODO: backに「名場面」を区別するデータが無いため、写真が用意できるまでは仮画像
 */
export const highlightPhotos: Photo[] = [
	{ id: "highlight-1", src: "/images/photo-placeholder.png", alt: "名場面" },
	{ id: "highlight-2", src: "/images/photo-placeholder.png", alt: "名場面" },
	{ id: "highlight-3", src: "/images/photo-placeholder.png", alt: "名場面" },
];

export type MediaItem = {
	id: string;
	/** 表示用の掲載日（例: 2023/5/6） */
	date: string;
	/** <time dateTime> 用のISO日時 */
	dateTime?: string;
	title: string;
	/**
	 * 掲載画像。無い場合（動画など）は白い枠を表示する。
	 * TODO: 紹介動画のURLが決まったら埋め込みにする（メディアAPIは画像のみで動画URLを持たない）
	 */
	imageSrc?: string;
};
