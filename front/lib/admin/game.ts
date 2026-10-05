/** 掲載同意の状態（back/src/gameImg/visibleImages.ts。member 以上にだけ返る） */
export type GameImageConsent = "pending" | "approved" | "rejected";

/** 試合風景の1枚 */
export type GameImage = {
	id: string;
	url: string;
	consent_status?: GameImageConsent;
	/** モザイク適用済みで、原本を見ているとき true（member 以上にだけ返る） */
	is_original?: boolean;
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
	pending: "掲載確認待ち",
	approved: "掲載OK",
	rejected: "掲載NG",
};

/** ISO日時を YYYY/MM/DD にする */
export const formatGameDate = (iso: string) => {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};

/** モザイクの1領域（元画像のピクセル座標。back/src/gameImg/mosaicLogic.ts） */
export type GameMosaicRegion = {
	x: number;
	y: number;
	width: number;
	height: number;
	pixel_size?: number;
};

/** GET /api/gameImg/images/:imageId/mosaic */
export type GameMosaic = {
	id: string;
	/** 公開中の画像（モザイク適用中は適用後） */
	url: string;
	/** 編集のベースにする原本 */
	original_url: string;
	has_mosaic: boolean;
	mosaic_regions: GameMosaicRegion[];
};

/** 1枚の画像に置けるモザイク領域の上限（back の MAX_MOSAIC_REGIONS） */
export const GAME_MOSAIC_MAX_REGIONS = 20;

/** 掲載取り下げ依頼の対応状況（back/src/consent/index.ts） */
export type ConsentRequestStatus = "pending" | "accepted" | "rejected";

/** GET /api/consent-requests の1件（使う項目だけ） */
export type ConsentRequest = {
	id: string;
	image_id: string;
	reason: string | null;
	status: ConsentRequestStatus;
	created_at: string;
	handled_at: string | null;
	requester_name: string;
	handler_name: string | null;
	image_url: string | null;
	image_consent_status: GameImageConsent | null;
};

/** 取り下げ依頼の対応状況の表示文言 */
export const consentRequestStatusLabel: Record<ConsentRequestStatus, string> = {
	pending: "未対応",
	accepted: "取り下げ済み",
	rejected: "見送り",
};
