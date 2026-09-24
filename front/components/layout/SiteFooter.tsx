import Link from "next/link";
import { footerNavItems } from "@/lib/routes";

/** ページ下部のフッター（Figma: Frame 145 1028:311）。左の白枠にはチームロゴが入る。 */
export function SiteFooter() {
	return (
		<footer className="flex w-full items-center gap-[42px] px-6 pt-20 pb-6">
			{/* TODO: フッター用ロゴ画像を受け取ったら next/image で差し替える */}
			<div
				role="img"
				aria-label="西尾ブレイズ ロゴ"
				className="h-[362px] w-[200px] shrink-0 bg-white"
			/>
			<nav aria-label="フッターメニュー" className="shrink-0">
				<ul className="flex flex-col items-center gap-8 text-center font-mincho text-[16px] leading-[22px] tracking-[1.5px] whitespace-nowrap text-white">
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
