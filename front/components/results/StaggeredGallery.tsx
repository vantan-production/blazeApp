import { FramedImage } from "@/components/ui/FramedImage";
import type { Photo } from "./data";

type Props = {
	photos: Photo[];
};

/**
 * 左右交互に少し重ねて並べる写真ギャラリー（Figma: gallery 1145:381）。
 * 402px幅での写真幅240px（行幅の約70.6%）を上限に、狭い画面では比率を保って縮めて左右のずれを残す
 */
export function StaggeredGallery({ photos }: Props) {
	return (
		<ul className="flex w-full flex-col px-[7px]">
			{photos.map((photo, i) => (
				<li
					key={photo.id}
					className={`w-[70.6%] max-w-[240px] ${i % 2 === 0 ? "self-start" : "self-end"} ${
						i > 0 ? "-mt-[15px]" : ""
					}`}
				>
					<FramedImage
						src={photo.src}
						alt={photo.alt}
						width={240}
						height={160}
					/>
				</li>
			))}
		</ul>
	);
}
