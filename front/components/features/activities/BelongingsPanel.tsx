import Image from "next/image";
import { ContentPanel } from "@/components/ui/ContentPanel";

/**
 * 持ち物のイメージ画像
 * - シューズ: ジャパクリップ https://japaclip.com/sneakers/
 * - 水筒: ちょこなす https://choconasu.com/images/e0afc10b792f3016e6c1e9768dd0d12858ecfe5a4493cce8bdfbc7a94bf60185 （無料は1ページ5点まで）
 * - タオル: パブリックドメインQ https://publicdomainq.net/towel-0058613/
 * - 動きやすい服: イラストAC https://www.ac-illust.com/main/search_result.php?search_word=%E8%B5%B0%E8%80%85
 */
const belongingImages = [
	{ src: "/images/belongings-shoes.png" },
	{ src: "/images/belongings-bottle.png" },
	{ src: "/images/belongings-towel.png" },
	// 素材の余白が大きく他より小さく見えるため、少し拡大する
	{ src: "/images/belongings-clothes.png", className: "scale-[1.2]" },
];

type Props = {
	items: string[];
};

/** 持ち物を青枠のチップで並べ、イメージ画像を添える白パネル */
export function BelongingsPanel({ items }: Props) {
	return (
		<ContentPanel title="持ち物" titleAs="h2">
			<div className="flex flex-col items-center gap-5">
				<ul className="flex flex-wrap justify-center gap-2">
					{items.map((item) => (
						<li
							key={item}
							className="rounded-[1000px] border-2 border-brand-blue px-4 text-[16px] leading-[32px] tracking-[1px] whitespace-nowrap"
						>
							{item}
						</li>
					))}
				</ul>
				{/* 1枚の幅は常に4等分にして、枚数が少なくても中央寄せで横一列に並べる */}
				<ul className="flex w-full max-w-[460px] justify-center gap-2 sm:gap-3">
					{belongingImages.map((image) => (
						<li
							key={image.src}
							className="relative aspect-square w-[calc((100%-1.5rem)/4)] sm:w-[calc((100%-2.25rem)/4)]"
						>
							<Image
								src={image.src}
								alt=""
								fill
								sizes="(min-width: 640px) 115px, 25vw"
								className={`object-contain ${image.className ?? ""}`}
							/>
						</li>
					))}
				</ul>
			</div>
		</ContentPanel>
	);
}
