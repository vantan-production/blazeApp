import Image from "next/image";

type Props = {
	items: string[];
};

/** 持ち物リスト＋イメージ画像枠（Figma: Frame 93 980:364） */
export function Belongings({ items }: Props) {
	return (
		<div className="flex w-full items-center justify-center gap-[clamp(16px,8.96vw,36px)]">
			<ul className="flex flex-col px-[10px]">
				{items.map((item) => (
					<li key={item} className="px-[10px] py-[5px]">
						{item}
					</li>
				))}
			</ul>
			{/* TODO: 持ち物のイメージ画像が用意できたら差し替える（Figmaも仮置きの画像アイコン） */}
			<div className="flex aspect-[137/108] w-[clamp(100px,34.08vw,137px)] shrink-0 items-center justify-center bg-[#d9d9d9]">
				<Image
					src="/icons/image-placeholder.svg"
					alt=""
					width={53}
					height={37}
				/>
			</div>
		</div>
	);
}
