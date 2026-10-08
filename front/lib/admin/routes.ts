/** 管理画面（SPのみ）のルート定義。公開サイトの lib/routes.ts とは分けて管理する。 */
export const adminRoutes = {
	top: "/admin",
	login: "/admin/login",
	// 招待メールのリンク（?token=...）から開く想定
	register: "/admin/register",
	news: "/admin/news",
	newsNew: "/admin/news/new",
	media: "/admin/media",
	mediaNew: "/admin/media/new",
	achievements: "/admin/achievements",
	achievementsNew: "/admin/achievements/new",
	game: "/admin/game",
	gameNew: "/admin/game/new",
	// 関係者（member）から届いた試合風景の掲載取り下げ依頼
	gameConsentRequests: "/admin/game/consent-requests",
	inquiry: "/admin/inquiry",
	// 自分のアカウント（プロフィール・通知設定・ログアウト・削除）
	account: "/admin/account",
	// 以下はログインしていなくても開ける画面
	forgotPassword: "/admin/forgot-password",
	// パスワード再設定メールのリンク（?token=...）から開く。パスは back/src/utils/mail.ts の buildPasswordResetEmail と合わせる
	resetPassword: "/admin/reset-password",
	// 削除から30日以内のアカウントを元に戻す
	accountRecover: "/admin/account-recover",

	// 体験申込者への連絡メール（送信履歴一覧・新規送信）
	trialNotices: "/admin/trial-notices",
	trialNoticesNew: "/admin/trial-notices/new",
	// 体験申し込みの一覧（詳細は adminTrialApplicationDetailPath）
	trialApplications: "/admin/trial-applications",
} as const;

/** 問い合わせ詳細のパス */
export const adminInquiryDetailPath = (id: string) =>
	`${adminRoutes.inquiry}/${id}`;

/** 関係者ページ（member 向け。front/members の memberRoutes.top と同じ） */
export const membersTopPath = "/members";

/** ログイン後の行き先。member は関係者ページ、admin / owner は管理画面TOP */
export const homePathForRole = (role: string) =>
	role === "member" ? membersTopPath : adminRoutes.top;

/** ニュース詳細のパス */
export const adminNewsDetailPath = (id: string) => `${adminRoutes.news}/${id}`;

/** 実績詳細のパス */
export const adminAchievementDetailPath = (id: string) =>
	`${adminRoutes.achievements}/${id}`;

/** メディア情報詳細のパス */
export const adminMediaDetailPath = (id: string) =>
	`${adminRoutes.media}/${id}`;

/** 試合風景詳細のパス */
export const adminGameDetailPath = (id: string) => `${adminRoutes.game}/${id}`;

/** 試合風景の画像1枚のモザイク編集のパス */
export const adminGameMosaicPath = (id: string, imageId: string) =>
	`${adminGameDetailPath(id)}/images/${imageId}/mosaic`;

/** 体験申し込み詳細のパス（URL には申し込みIDだけを載せ、名前などの個人情報は載せない） */
export const adminTrialApplicationDetailPath = (id: string) =>
	`${adminRoutes.trialApplications}/${id}`;
