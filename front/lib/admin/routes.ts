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
	achievementsNew: "/admin/achievements/new",
	game: "/admin/game",
	inquiry: "/admin/inquiry",
} as const;

/** 問い合わせ詳細のパス */
export const adminInquiryDetailPath = (id: string) =>
	`${adminRoutes.inquiry}/${id}`;

/** 実績詳細のパス */
export const adminAchievementDetailPath = (id: string) =>
	`${adminRoutes.achievements}/${id}`;
