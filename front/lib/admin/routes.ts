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
	// 自分のアカウント（プロフィール・通知設定・ログアウト・削除）
	account: "/admin/account",
	// 以下はログインしていなくても開ける画面
	forgotPassword: "/admin/forgot-password",
	// パスワード再設定メールのリンク（?token=...）から開く。パスは back/src/utils/mail.ts の buildPasswordResetEmail と合わせる
	resetPassword: "/admin/reset-password",
	// 削除から30日以内のアカウントを元に戻す
	accountRecover: "/admin/account-recover",
} as const;

/** 問い合わせ詳細のパス */
export const adminInquiryDetailPath = (id: string) =>
	`${adminRoutes.inquiry}/${id}`;
