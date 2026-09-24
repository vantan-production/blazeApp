import Image from "next/image";
import Link from "next/link";
import { footerNavItems } from "@/lib/routes";
import { Copyright } from "./Copyright";

/**
 * ページ下部のフッター（Figma: Frame 145 1028:311）。チームロゴ（本文と同じ左右24pxの余白で横幅いっぱい）の下にナビを縦に並べ、最後にコピーライトを置く。
 * PageShell から全ページ共通で表示される。
 */
export function SiteFooter() {
	return (
		<footer className="flex w-full flex-col items-center gap-10 px-6 pt-20 pb-6">
			<Image
				src="/images/nishioBlaze.jpg"
				alt="西尾ブレイズ Aichi Dodge Ball Club Team"
				width={1873}
				height={874}
				sizes="(max-width: 430px) 100vw, 430px"
				className="h-auto w-full"
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
			<Copyright />
		</footer>
	);
}
