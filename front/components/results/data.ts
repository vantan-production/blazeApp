// 試合結果・実績・試合風景・メディア情報はAPIから取得する（./api.ts）。
// ここにはbackに対応するデータが無く、静的に持つしかないものだけを置く

import type { MatchSet } from "@/lib/matchSets";

/** 前回の試合結果（Figma: last time results 1031:551）。GET /api/match-results の先頭1件 */
export type LastMatch = {
	/** 大会名（例: 西尾市長杯ドッジボール大会） */
	tournamentName: string;
	/** 大会での成績（例: ベスト8）。未登録なら undefined */
	tournamentResult?: string;
	/** 表示用の試合日（例: 2026/10/4） */
	date: string;
	/** <time dateTime> 用の日付（YYYY-MM-DD） */
	dateTime: string;
	/** 対戦相手（任意）。無ければスコアを出さず、大会名と成績だけを表示する */
	opponentTeam?: string;
	/** セットごとの得点（対戦相手があるときは1〜3セット、無いときは空） */
	sets: MatchSet[];
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
