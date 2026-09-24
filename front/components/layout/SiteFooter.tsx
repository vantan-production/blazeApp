import Image from "next/image";
import Link from "next/link";
import { footerNavItems } from "@/lib/routes";

/** ページ下部のフッター（Figma: Frame 145 1028:311）。左にチームロゴ、右にナビを置く。 */
export function SiteFooter() {
	return (
		<footer className="flex w-full items-center gap-[clamp(16px,8vw,42px)] px-[clamp(16px,6vw,24px)] pt-20 pb-6">
			<Image
				src="/img/nishioBlaze.jpg"
				alt="西尾ブレイズ Aichi Dodge Ball Club Team"
				width={200}
				height={93}
				className="h-auto w-[min(200px,50vw)] min-w-0"
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
