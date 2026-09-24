"use client";

import Image from "next/image";
import { useState } from "react";

export type GalleryPhoto = {
	src: string;
	alt: string;
};

type Props = {
	photos: GalleryPhoto[];
};

/** 白枠4px・角丸12pxの写真枠。サイズは className で親から指定する */
function PhotoFrame({
	photo,
	className,
}: {
	photo: GalleryPhoto;
	className: string;
}) {
	return (
		<div
			className={`overflow-hidden rounded-[12px] border-4 border-brand-white ${className}`}
		>
			<div className="relative size-full">
				<Image
					src={photo.src}
					alt={photo.alt}
					fill
					sizes="70vw"
					className="object-cover"
				/>
			</div>
		</div>
	);
}

/**
 * 活動写真のカルーセル（Figma: gallery 1250:344）。
 * 中央の写真を大きく、前後の写真を画面の左右端から覗かせる。端の写真を押すとその写真が中央に来る。
 * 寸法はFigmaの402px幅を基準に cqw（このギャラリー幅に対する%）へ換算している。
 * 画面端まで写真を出すため、親の左右余白（px-6）を打ち消して全幅に広げる。
 */
export function ActivityGallery({ photos }: Props) {
	const [index, setIndex] = useState(0);
	const count = photos.length;
	if (count === 0) return null;

	const at = (diff: number) => photos[(index + diff + count) % count];
	const move = (diff: number) =>
		setIndex((prev) => (prev + diff + count) % count);
	const hasSides = count > 1;

	return (
		<div className="@container -mx-6 w-[calc(100%+48px)] self-stretch overflow-hidden">
			<section
				aria-roledescription="カルーセル"
				aria-label="活動写真"
				className="relative flex h-[72.39cqw] items-center justify-center"
			>
				{hasSides && (
					<button
						type="button"
						onClick={() => move(-1)}
						aria-label="前の写真"
						className="absolute top-1/2 left-[-51.24cqw] -translate-y-1/2 cursor-pointer"
					>
						<PhotoFrame photo={at(-1)} className="h-[39.8cqw] w-[59.7cqw]" />
					</button>
				)}
				<PhotoFrame photo={at(0)} className="h-[46.27cqw] w-[69.65cqw]" />
				{hasSides && (
					<button
						type="button"
						onClick={() => move(1)}
						aria-label="次の写真"
						className="absolute top-1/2 right-[-51.24cqw] -translate-y-1/2 cursor-pointer"
					>
						<PhotoFrame photo={at(1)} className="h-[39.8cqw] w-[59.7cqw]" />
					</button>
				)}
			</section>
			<p aria-live="polite" className="sr-only">
				{`${index + 1}枚目 / 全${count}枚`}
			</p>
		</div>
	);
}
