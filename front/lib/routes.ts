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

/** ドロワーメニューのナビ項目（Figma: ドロワーメニュー 1511:458） */
export const drawerNavItems: NavItem[] = [
	{ label: "TOP", href: routes.top },
	{ label: "紹介", href: routes.team },
	{ label: "活動内容", href: routes.activities },
	{ label: "実績", href: routes.results },
	{ label: "お問い合わせ", href: routes.contact },
	{ label: "おしらせ", href: routes.news },
];

/** ドロワーメニュー右列のナビ項目（Figmaでは左列の一部と同じ内容） */
export const drawerSubNavItems: NavItem[] = drawerNavItems.slice(0, 4);

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
