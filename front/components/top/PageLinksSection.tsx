import { PhotoCard } from "@/components/ui/PhotoCard";
import { PillHeading } from "@/components/ui/PillHeading";
import { routes } from "@/lib/routes";

// TODO: imageSrc 未指定のカードは仮の画像（card-bg.png）。カードごとに別の画像へ差し替える
const pageLinks: {
	title: string;
	subtitle: string;
	href: string;
	imageSrc?: string;
	imagePosition?: string;
}[] = [
	{
		title: "チーム紹介",
		subtitle: "TEAM",
		href: routes.team,
		imageSrc: "/images/nishioBlaze.jpg",
	},
	{
		title: "監督コーチ紹介",
		subtitle: "COACHES",
		href: routes.coaches,
		imageSrc: "/images/director.jpg",
		// 縦長写真なので監督の顔が入る高さに合わせる
		imagePosition: "center 20%",
	},
	{
		title: "ニュース",
		subtitle: "NEWS",
		href: routes.news,
		imageSrc: "/images/audience.jpeg",
		// 応援している観客が入る高さに合わせる
		imagePosition: "center 40%",
	},
	{
		title: "活動内容",
		subtitle: "ACTIVITIES",
		href: routes.activities,
		imageSrc: "/images/group-photo.JPG",
		// 前後2列の選手の顔が入る高さに合わせる
		imagePosition: "center 45%",
	},
	{ title: "実績・試合結果", subtitle: "RESULTS", href: routes.results },
];

/** 各ページへのリンクカード一覧。コンテンツ幅いっぱいのカードを縦一列に並べる */
export function PageLinksSection() {
	return (
		<section className="flex w-full flex-col items-center gap-8">
			<PillHeading>西尾ブレイズを知る</PillHeading>
			<ul className="flex w-full flex-col gap-3">
				{pageLinks.map((link) => (
					<li key={link.href}>
						<PhotoCard
							title={link.title}
							subtitle={link.subtitle}
							href={link.href}
							imageSrc={link.imageSrc}
							imagePosition={link.imagePosition}
							// 仮の画像（ボールが左寄り）のみ反転する
							mirrorImage={!link.imageSrc}
						/>
					</li>
				))}
			</ul>
		</section>
	);
}
