import Image from "next/image";
import type { MediaItem } from "./data";

type Props = {
	items: MediaItem[];
};

/** メディア掲載情報の一覧（Figma: gallery 1250:357） */
export function MediaList({ items }: Props) {
	return (
		<ul className="flex w-full flex-col gap-8 px-[26px] py-5">
			{items.map((item) => (
				<li key={item.id} className="flex flex-col gap-2">
					<time className="text-[20px]">{item.date}</time>
					<p className="text-[16px]">{item.title}</p>
					<div className="relative aspect-video w-full overflow-hidden rounded-[8px] bg-white">
						{item.imageSrc && (
							<Image
								src={item.imageSrc}
								alt={item.title}
								fill
								sizes="302px"
								className="object-cover object-top"
							/>
						)}
					</div>
				</li>
			))}
		</ul>
	);
}
