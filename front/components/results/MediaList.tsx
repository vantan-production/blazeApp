import Image from "next/image";
import type { MediaItem } from "./data";

type Props = {
	items: MediaItem[];
};

/** メディア掲載情報の一覧。画像を上に、日付と見出しを下に置いた白いカードを縦に並べる */
export function MediaList({ items }: Props) {
	return (
		<ul className="flex w-full flex-col gap-6">
			{items.map((item) => (
				<li
					key={item.id}
					className="overflow-hidden rounded-[20px] bg-brand-white text-brand-blue"
				>
					<div className="relative aspect-video w-full overflow-hidden bg-brand-blue/10">
						{item.imageSrc ? (
							<Image
								src={item.imageSrc}
								alt={item.title}
								fill
								sizes="(max-width: 430px) 100vw, 430px"
								className="object-cover object-top"
							/>
						) : (
							<div className="flex size-full items-center justify-center">
								<span className="flex size-14 items-center justify-center rounded-full bg-brand-red">
									<svg
										viewBox="0 0 24 24"
										width={24}
										height={24}
										fill="currentColor"
										aria-hidden="true"
										className="ml-1 text-brand-white"
									>
										<path d="M6 4l14 8-14 8z" />
									</svg>
								</span>
							</div>
						)}
					</div>
					<div className="flex flex-col gap-2 border-t-4 border-brand-yellow px-4 pt-3 pb-4">
						<time
							dateTime={item.dateTime}
							className="font-inter text-[13px] font-bold tracking-[1px] text-brand-red"
						>
							{item.date}
						</time>
						<p className="text-[15px] leading-[1.5] font-bold">{item.title}</p>
					</div>
				</li>
			))}
		</ul>
	);
}
