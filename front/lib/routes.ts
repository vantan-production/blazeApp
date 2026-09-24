/** 公開サイトのルート定義。ナビゲーション系コンポーネントはここを参照する。 */
export const routes = {
	top: "/",
	team: "/about/team",
	coaches: "/about/coaches",
	activities: "/activities",
	results: "/results",
	news: "/news",
	contact: "/contact",
	// Figma注記「体験フォームページが必要」: デザイン未作成のため仮のパス
	trial: "/trial",
} as const;

export type NavItem = { label: string; href: string };

/** ドロワーメニューのナビ項目。2列に分けて表示する（Figma: ドロワーメニュー 1511:458） */
export const drawerNavColumns: NavItem[][] = [
	[
		{ label: "トップ", href: routes.top },
		{ label: "チーム紹介", href: routes.team },
		{ label: "監督コーチ紹介", href: routes.coaches },
	],
	[
		{ label: "ニュース", href: routes.news },
		{ label: "活動内容", href: routes.activities },
		{ label: "実績・試合結果", href: routes.results },
	],
];

/** ページ下部フッターのナビ項目（Figma: Frame 145 1028:311） */
export const footerNavItems: NavItem[] = [
	{ label: "TOP", href: routes.top },
	{ label: "紹介", href: routes.team },
	{ label: "活動内容", href: routes.activities },
	{ label: "実績", href: routes.results },
	{ label: "ギャラリー", href: routes.news },
	{ label: "体験案内", href: routes.trial },
	{ label: "アクセス", href: routes.contact },
];
