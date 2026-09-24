import Link from "next/link";
import { footerNavItems } from "@/lib/routes";

/**
 * ページ下部のフッター（Figma: Frame 145 1028:311）。
 * 左の白ボックスはFigma上で中身が未定のため、枠のみ置いている。
 */
export function SiteFooter() {
	return (
		<footer className="flex w-full items-center gap-[42px] px-6 pt-20 pb-6">
			<div className="h-[362px] w-[200px] shrink-0 bg-white" />
			<nav aria-label="フッターメニュー" className="w-[86px] shrink-0">
				<ul className="flex flex-col items-center gap-8 text-center font-mincho text-[16px] leading-[22px] tracking-[1.5px] text-white">
					{footerNavItems.map((item) => (
						<li key={item.label}>
							<Link href={item.href}>{item.label}</Link>
						</li>
					))}
				</ul>
			</nav>
		</footer>
	);
}
