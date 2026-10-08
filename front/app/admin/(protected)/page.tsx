import {
	AdminMenuCard,
	type AdminMenuIcon,
} from "@/components/admin/top/AdminMenuCard";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "TOP | 西尾ブレイズ 管理画面",
};

const icon = (name: string, width = 24, height = 24): AdminMenuIcon => ({
	src: `/icons/admin/${name}.svg`,
	width,
	height,
});

/** 管理画面TOPのメニュー（Figma: Frame 196 2020:1026） */
const menuItems = [
	{ label: "問い合わせ返信", href: adminRoutes.inquiry, icon: icon("mail") },
	// quill:paper はアイコン枠24pxの中に 16.4x20.9 の図形が入る
	{
		label: "ニュース投稿",
		href: adminRoutes.news,
		icon: icon("paper", 16.4, 20.9),
	},
	{ label: "実績更新", href: adminRoutes.achievements, icon: icon("trophy") },
	{ label: "試合風景更新", href: adminRoutes.game, icon: icon("camera") },
	{ label: "メディア情報", href: adminRoutes.media, icon: icon("tv") },
];

/** 管理画面TOP（Figma: top 1779:848） */
export default function AdminTopPage() {
	return (
		<main className="flex w-full flex-1 flex-col items-center gap-[90px] px-[27px] pt-[54px] pb-12">
			<h1 className="text-[36px] leading-[22px] tracking-[1.5px] text-brand-white">
				TOP
			</h1>
			<nav aria-label="管理メニュー" className="w-full">
				<ul className="flex flex-col gap-8">
					{menuItems.map((item) => (
						<li key={item.href}>
							<AdminMenuCard {...item} />
						</li>
					))}
				</ul>
			</nav>
		</main>
	);
}
