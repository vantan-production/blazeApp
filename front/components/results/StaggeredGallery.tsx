import { FramedImage } from "@/components/ui/FramedImage";
import type { Photo } from "./data";

type Props = {
	photos: Photo[];
};

/** 左右交互に少し重ねて並べる写真ギャラリー（Figma: gallery 1145:381） */
export function StaggeredGallery({ photos }: Props) {
	return (
		<ul className="flex w-full flex-col px-[7px]">
			{photos.map((photo, i) => (
				<li
					key={photo.id}
					className={`${i % 2 === 0 ? "self-start" : "self-end"} ${
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
