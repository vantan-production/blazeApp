/** 掲載同意の状態（back/src/db/schema.ts の images.consent_status） */
export type GalleryConsentStatus = "pending" | "approved" | "rejected";

/** GET /api/members/gallery の1枚（back/src/members/gallery.ts） */
export type MemberGalleryImage = {
	id: string;
	game_id: string;
	consent_status: GalleryConsentStatus;
	created_at: string;
	admin_name: string;
	/** 原本（モザイクなし）の署名付きURL */
	url: string;
	/** モザイク適用済みの画像で、退避した原本を返しているとき true */
	is_original: boolean;
};

/** GET /api/members/gallery/:imageId/download */
export type GalleryDownload = {
	id: string;
	/** 原本の署名付きURL（発行から expires_in 秒で失効） */
	url: string;
	is_original: boolean;
	expires_in: number;
};

/** 関係者向けの掲載状態の文言（ホームページに載っているかを伝える） */
export const galleryConsentLabel: Record<GalleryConsentStatus, string> = {
	pending: "掲載確認中",
	approved: "HP掲載中",
	rejected: "HP非掲載",
};
