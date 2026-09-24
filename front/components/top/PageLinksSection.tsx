import { PhotoCard } from "@/components/ui/PhotoCard";
import { PillHeading } from "@/components/ui/PillHeading";
import { routes } from "@/lib/routes";

// 長いタイトルは \n の位置で改行する（カード幅172pxに1行で収まらないため）
const pageLinks = [
	{ title: "チーム紹介", href: routes.team },
	{ title: "監督コーチ\n紹介", href: routes.coaches },
	{ title: "ニュース", href: routes.news },
	{ title: "活動内容", href: routes.activities },
	{ title: "実績・\n試合結果", href: routes.results },
];

/** 各ページへのリンクカード一覧（Figmaの card 978:569 を2列に並べる。奇数個の最後は中央寄せ） */
export function PageLinksSection() {
	return (
		<section className="flex w-full flex-col items-center gap-8">
			<PillHeading>西尾ブレイズを知る</PillHeading>
			<ul className="grid w-full grid-cols-2 gap-[10px] [&_span]:whitespace-pre-line [&>li:last-child:nth-child(odd)]:col-span-2 [&>li:last-child:nth-child(odd)]:w-[calc(50%-5px)] [&>li:last-child:nth-child(odd)]:justify-self-center">
				{pageLinks.map((link) => (
					<li key={link.href}>
						<PhotoCard title={link.title} href={link.href} />
					</li>
				))}
			</ul>
		</section>
	);
}
