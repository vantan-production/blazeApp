/** 管理画面（SPのみ）のルート定義。公開サイトの lib/routes.ts とは分けて管理する。 */
export const adminRoutes = {
	top: "/admin",
	login: "/admin/login",
	// 招待メールのリンク（?token=...）から開く想定
	register: "/admin/register",
	news: "/admin/news",
	newsNew: "/admin/news/new",
	media: "/admin/media",
	achievements: "/admin/achievements",
	game: "/admin/game",
	inquiry: "/admin/inquiry",
} as const;

/** 問い合わせ詳細のパス */
export const adminInquiryDetailPath = (id: string) =>
	`${adminRoutes.inquiry}/${id}`;
