import Image from "next/image";
import { ContentPanel } from "@/components/ui/ContentPanel";

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
				{/* TODO: 持ち物のイメージ画像が用意できたら差し替える（Figmaも仮置きの画像アイコン） */}
				<div className="flex aspect-[137/108] w-[min(137px,40%)] items-center justify-center rounded-[12px] bg-[#d9d9d9]">
					<Image
						src="/icons/image-placeholder.svg"
						alt=""
						width={53}
						height={37}
					/>
				</div>
			</div>
		</ContentPanel>
	);
}
