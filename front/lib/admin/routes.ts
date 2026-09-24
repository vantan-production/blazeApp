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
	inquiry: "/admin/inquiry",
	// 体験申込者への連絡メール（送信履歴一覧・新規送信）
	trialNotices: "/admin/trial-notices",
	trialNoticesNew: "/admin/trial-notices/new",
} as const;

/** 問い合わせ詳細のパス */
export const adminInquiryDetailPath = (id: string) =>
	`${adminRoutes.inquiry}/${id}`;

/** 体験申込者への連絡メール（送信履歴）詳細のパス */
export const adminTrialNoticeDetailPath = (id: string) =>
	`${adminRoutes.trialNotices}/${id}`;
