import Image from "next/image";
import Link from "next/link";
import {
	AdminMenuCard,
	type AdminMenuIcon,
} from "@/components/admin/top/AdminMenuCard";
import { adminRoutes } from "@/lib/admin/routes";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
	title: "TOP | 西尾ブレイズ 管理画面",
};

const icon = (name: string, width = 24, height = 24): AdminMenuIcon => ({
	src: `/icons/admin/${name}.svg`,
	width,
	height,
});

// 別ブランチで追加する画面のパス。各ブランチの adminRoutes と同じ値で、
// ここで adminRoutes に足すとマージ時にキーが重複するため直接書く（マージ後に adminRoutes へ寄せる）
const menuPath = {
	trialApplications: "/admin/trial-applications",
	trialNotices: "/admin/trial-notices",
	notices: "/admin/notices",
	surveys: "/admin/surveys",
	documents: "/admin/documents",
	submissions: "/admin/submissions",
	users: "/admin/users",
	account: "/admin/account",
} as const;

type MenuItem = {
	label: string;
	href: string;
	icon: AdminMenuIcon;
	/** owner にだけ出す */
	ownerOnly?: boolean;
};

type MenuSection = {
	title: string;
	items: MenuItem[];
};

/** 管理画面TOPのメニュー（Figma: Frame 196 2020:1026 の5項目に、後から足した画面をまとまりごとに加えている） */
const menuSections: MenuSection[] = [
	{
		title: "ホームページ",
		items: [
			{
				label: "問い合わせ返信",
				href: adminRoutes.inquiry,
				icon: icon("mail"),
			},
			// quill:paper はアイコン枠24pxの中に 16.4x20.9 の図形が入る
			{
				label: "ニュース投稿",
				href: adminRoutes.news,
				icon: icon("paper", 16.4, 20.9),
			},
			{
				label: "実績更新",
				href: adminRoutes.achievements,
				icon: icon("trophy"),
			},
			{ label: "試合風景更新", href: adminRoutes.game, icon: icon("camera") },
			{ label: "メディア情報", href: adminRoutes.media, icon: icon("tv") },
		],
	},
	{
		title: "体験",
		items: [
			{
				label: "体験申し込み",
				href: menuPath.trialApplications,
				icon: icon("event"),
			},
			{
				label: "体験申込者への連絡",
				href: menuPath.trialNotices,
				icon: icon("send"),
			},
		],
	},
	{
		title: "関係者向け",
		items: [
			{ label: "お知らせ", href: menuPath.notices, icon: icon("bell") },
			{ label: "アンケート", href: menuPath.surveys, icon: icon("checklist") },
			{ label: "資料庫", href: menuPath.documents, icon: icon("folder") },
			{ label: "投稿申請", href: menuPath.submissions, icon: icon("inbox") },
		],
	},
	{
		title: "管理",
		items: [
			{
				label: "ユーザー管理",
				href: menuPath.users,
				icon: icon("group"),
				ownerOnly: true,
			},
			{ label: "アカウント", href: menuPath.account, icon: icon("account") },
		],
	},
];

/** 管理画面TOP（Figma: top 1779:848） */
export default async function AdminTopPage() {
	// (protected) のレイアウトでログイン済みを確認しているので、ここでは owner かどうかだけ見る
	const user = await getCurrentUser();
	const isOwner = user?.role === "owner";

	return (
		<main className="relative flex w-full flex-1 flex-col items-center gap-[60px] px-[27px] pt-[54px] pb-12">
			{/* 右上のアイコンからアカウント画面（ログアウト・通知設定）へ */}
			<Link
				href={menuPath.account}
				aria-label="アカウント"
				className="absolute top-[14px] right-[18px] flex size-11 items-center justify-center rounded-full bg-brand-white shadow-[0px_2px_6px_rgba(0,0,0,0.3)] transition-opacity hover:opacity-80"
			>
				<Image src="/icons/admin/account.svg" alt="" width={26} height={26} />
			</Link>
			<h1 className="text-[36px] leading-[22px] tracking-[1.5px] text-brand-white">
				管理者ページ
			</h1>
			<nav aria-label="管理メニュー" className="flex w-full flex-col gap-8">
				{menuSections.map((section) => {
					const items = section.items.filter(
						(item) => !item.ownerOnly || isOwner,
					);
					if (items.length === 0) return null;
					return (
						<section key={section.title} className="flex flex-col gap-3">
							<h2 className="px-1 text-[14px] leading-[22px] tracking-[1px] text-brand-white/80">
								{section.title}
							</h2>
							<ul className="flex flex-col gap-4">
								{items.map((item) => (
									<li key={item.href}>
										<AdminMenuCard
											href={item.href}
											label={item.label}
											icon={item.icon}
										/>
									</li>
								))}
							</ul>
						</section>
					);
				})}
			</nav>
		</main>
	);
}
