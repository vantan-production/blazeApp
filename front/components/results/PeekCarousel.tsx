"use client";

import { useState } from "react";
import { FramedImage } from "@/components/ui/FramedImage";
import type { Photo } from "./data";

type Props = {
	photos: Photo[];
};

/**
 * 中央の写真を大きく、前後の写真を左右の端から少し覗かせるカルーセル
 * （Figma: gallery 1250:344）。端の写真を押すとその写真が中央に来る。
 */
export function PeekCarousel({ photos }: Props) {
	const [index, setIndex] = useState(0);
	const count = photos.length;
	if (count === 0) return null;

	const at = (diff: number) => photos[(index + diff + count) % count];
	const move = (diff: number) =>
		setIndex((prev) => (prev + diff + count) % count);
	const current = at(0);
	const hasSides = count > 1;

	return (
		<div className="flex h-[291px] w-full items-center justify-center gap-[27px] overflow-hidden">
			{hasSides && (
				<button
					type="button"
					onClick={() => move(-1)}
					aria-label="前の写真"
					className="shrink-0 cursor-pointer"
				>
					<FramedImage src={at(-1).src} alt="" width={240} height={160} />
				</button>
			)}
			{/* 402px幅で左右の写真が10pxずつ覗く幅（280px）にし、狭い画面では中央の写真を縮めて左右を覗かせる */}
			<div
				className={`max-w-[280px] shrink-0 ${hasSides ? "w-[calc(100%-74px)]" : "w-full"}`}
			>
				<FramedImage
					src={current.src}
					alt={current.alt}
					width={280}
					height={186}
				/>
			</div>
			{hasSides && (
				<button
					type="button"
					onClick={() => move(1)}
					aria-label="次の写真"
					className="shrink-0 cursor-pointer"
				>
					<FramedImage src={at(1).src} alt="" width={240} height={160} />
				</button>
			)}
		</div>
	);
}
