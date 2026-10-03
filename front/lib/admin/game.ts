/** 掲載同意の状態（back/src/gameImg/visibleImages.ts。member 以上にだけ返る） */
export type GameImageConsent = "pending" | "approved" | "rejected";

/** 試合風景の1枚 */
export type GameImage = {
	id: string;
	url: string;
	consent_status?: GameImageConsent;
};

/** GET /api/gameImg の一覧・詳細に並ぶ試合風景（使う項目だけ） */
export type GamePost = {
	id: string;
	/** 1枚目の画像の署名付きURL（画像が無ければ null） */
	img_url: string | null;
	images: GameImage[];
	created_at: string;
};

/** 掲載同意の表示文言 */
export const gameConsentLabel: Record<GameImageConsent, string> = {
	pending: "同意未確認",
	approved: "掲載OK",
	rejected: "掲載NG",
};

/** ISO日時を YYYY/MM/DD にする */
export const formatGameDate = (iso: string) => {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};
