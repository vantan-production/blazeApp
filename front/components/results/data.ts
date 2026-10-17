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

/** 試合結果の一覧ページ用。前回の試合結果と同じ内容に id を付けたもの */
export type MatchResult = LastMatch & { id: string };

/** チーム目標。backに対応するデータが無いため固定文言 */
export const teamGoal = "勝利を目指して挑戦し続けるチームへ";

export type Achievement = {
	id: string;
	/** 番号バッジに出す文字列（例: 01）。一番古い実績が 01 */
	number: string;
	imageSrc: string;
	title: string;
	/** 表示用の登録日（例: 2023/5/6） */
	date: string;
	/** <time dateTime> 用のISO日時 */
	dateTime: string;
};

/** 実績の詳細ページ用（GET /api/achievement/:id） */
export type AchievementDetail = Omit<Achievement, "number"> & {
	body: string;
	/** サムネイル（あれば先頭）と本文の画像。1枚もなければ代替画像1枚 */
	images: string[];
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

/** メディア情報の詳細ページ用（GET /api/media/:id） */
export type MediaDetail = Omit<MediaItem, "imageSrc"> & {
	/** 本文。掲載先のURLが書かれていることが多いので、表示時にリンクにする */
	body: string;
	/** 掲載画像と本文に添付された画像。無ければ空 */
	images: string[];
};
