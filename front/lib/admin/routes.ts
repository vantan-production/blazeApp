/** 管理画面（SPのみ）のルート定義。公開サイトの lib/routes.ts とは分けて管理する。 */
export const adminRoutes = {
	top: "/admin",
	// ログイン/新規登録の入口（Figma: ログイン 1836:968）
	welcome: "/admin/welcome",
	login: "/admin/login",
	// 招待メールのリンク（?token=...）から開く想定
	register: "/admin/register",
	news: "/admin/news",
	newsNew: "/admin/news/new",
	media: "/admin/media",
	achievements: "/admin/achievements",
	game: "/admin/game",
	gameNew: "/admin/game/new",
	// 関係者（member）から届いた試合風景の掲載取り下げ依頼
	gameConsentRequests: "/admin/game/consent-requests",
	inquiry: "/admin/inquiry",
} as const;

/** 問い合わせ詳細のパス */
export const adminInquiryDetailPath = (id: string) =>
	`${adminRoutes.inquiry}/${id}`;

/** 試合風景詳細のパス */
export const adminGameDetailPath = (id: string) => `${adminRoutes.game}/${id}`;

/** 試合風景の画像1枚のモザイク編集のパス */
export const adminGameMosaicPath = (id: string, imageId: string) =>
	`${adminGameDetailPath(id)}/images/${imageId}/mosaic`;
