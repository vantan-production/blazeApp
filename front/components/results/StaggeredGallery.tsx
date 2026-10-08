import { FramedImage } from "@/components/ui/FramedImage";
import type { Photo } from "./data";

type Props = {
	photos: Photo[];
};

/**
 * 左右交互に少し傾けて重ねる写真ギャラリー。写真の後ろに黄・赤のずらした影を敷く。
 * 写真幅240px（行幅の約70.6%）を上限に、狭い画面では比率を保って縮めて左右のずれを残す
 */
export function StaggeredGallery({ photos }: Props) {
	return (
		<ul className="flex w-full flex-col px-[7px]">
			{photos.map((photo, i) => {
				const isLeft = i % 2 === 0;
				return (
					<li
						key={photo.id}
						className={`w-[70.6%] max-w-[240px] rounded-[12px] ${
							isLeft
								? "-rotate-2 self-start shadow-[6px_6px_0_0_var(--brand-yellow)]"
								: "rotate-2 self-end shadow-[-6px_6px_0_0_var(--brand-red)]"
						} ${i > 0 ? "-mt-[15px]" : ""}`}
					>
						<FramedImage
							src={photo.src}
							alt={photo.alt}
							width={240}
							height={160}
						/>
					</li>
				);
			})}
		</ul>
	);
}
