/** 公開サイトのルート定義。ナビゲーション系コンポーネントはここを参照する。 */
export const routes = {
	top: "/",
	team: "/about/team",
	coaches: "/about/coaches",
	activities: "/activities",
	// 活動内容ページの「主な活動場所」パネル
	access: "/activities#access",
	results: "/results",
	// 実績・試合結果ページの各「もっと見る」の遷移先（一覧ページ）
	resultsMatches: "/results/matches",
	resultsAchievements: "/results/achievements",
	resultsMatchPhotos: "/results/match-photos",
	resultsMedia: "/results/media",
	// トップの「お知らせ」欄から開く一覧・詳細（旧 /news は next.config.ts でリダイレクト）
	notice: "/notice",
	contact: "/contact",
	// Figma注記「体験フォームページが必要」: デザイン未作成のため仮のパス
	trial: "/trial",
	// ギャラリーページは未定のため仮のパス
	gallery: "/gallery",
} as const;

/** 実績の詳細ページ（実績スライダー・実績一覧のカードから開く） */
export function achievementDetailPath(id: string): string {
	return `${routes.resultsAchievements}/${id}`;
}

/** メディア情報の詳細ページ（メディア情報セクション・一覧のカードから開く） */
export function mediaDetailPath(id: string): string {
	return `${routes.resultsMedia}/${id}`;
}

export type NavItem = { label: string; href: string };

/** ドロワーメニューのナビ項目。2列に分けて表示する（Figma: ドロワーメニュー 1511:458） */
export const drawerNavColumns: NavItem[][] = [
	[
		{ label: "トップ", href: routes.top },
		{ label: "チーム紹介", href: routes.team },
		{ label: "監督コーチ紹介", href: routes.coaches },
		{ label: "ギャラリー", href: routes.gallery },
	],
	[
		{ label: "お知らせ", href: routes.notice },
		{ label: "活動内容", href: routes.activities },
		{ label: "実績・試合結果", href: routes.results },
		{ label: "アクセス", href: routes.access },
	],
];

/** ページ下部フッターのナビ項目（Figma: Frame 145 1028:311） */
export const footerNavItems: NavItem[] = [
	{ label: "TOP", href: routes.top },
	{ label: "紹介", href: routes.team },
	{ label: "活動内容", href: routes.activities },
	{ label: "実績", href: routes.results },
	{ label: "ギャラリー", href: routes.gallery },
	{ label: "体験案内", href: routes.trial },
	{ label: "アクセス", href: routes.access },
];
