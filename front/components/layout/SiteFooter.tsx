import Image from "next/image";
import Link from "next/link";
import { footerNavItems } from "@/lib/routes";

/** ページ下部のフッター（Figma: Frame 145 1028:311）。チームロゴの下にナビを縦に並べる。 */
export function SiteFooter() {
	return (
		<footer className="flex w-full flex-col items-center gap-10 px-6 pt-20 pb-6">
			<Image
				src="/img/nishioBlaze.jpg"
				alt="西尾ブレイズ Aichi Dodge Ball Club Team"
				width={280}
				height={131}
				className="h-auto w-[min(280px,75vw)]"
			/>
			<nav aria-label="フッターメニュー">
				<ul className="flex flex-col items-center gap-6 text-center font-mincho text-[16px] leading-[22px] tracking-[1.5px] whitespace-nowrap text-white">
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
