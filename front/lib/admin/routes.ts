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
} as const;

/** 問い合わせ詳細のパス */
export const adminInquiryDetailPath = (id: string) =>
	`${adminRoutes.inquiry}/${id}`;

/** アンケート・出欠確認（管理側）の一覧・新規作成 */
export const adminSurveyRoutes = {
	list: "/admin/surveys",
	new: "/admin/surveys/new",
} as const;

/** アンケートの詳細（集計結果・未回答者・削除）のパス */
export const adminSurveyDetailPath = (id: string) =>
	`${adminSurveyRoutes.list}/${id}`;

/** アンケートの編集のパス */
export const adminSurveyEditPath = (id: string) =>
	`${adminSurveyDetailPath(id)}/edit`;
