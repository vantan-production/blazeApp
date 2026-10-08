/** 関係者ページ（member 以上・SPのみ）のルート定義。管理画面の lib/admin/routes.ts とは分けて管理する。 */
export const memberRoutes = {
	top: "/members",
	notices: "/members/notices",
	surveys: "/members/surveys",
	gallery: "/members/gallery",
	documents: "/members/documents",
	submissions: "/members/submissions",
} as const;

/** お知らせ詳細のパス */
export const memberNoticeDetailPath = (id: string) =>
	`${memberRoutes.notices}/${id}`;

/** アンケート回答のパス */
export const memberSurveyDetailPath = (id: string) =>
	`${memberRoutes.surveys}/${id}`;
