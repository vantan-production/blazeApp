"use client";

import { useState } from "react";
import { FramedImage } from "@/components/ui/FramedImage";
import { CarouselDots } from "./CarouselDots";
import type { Photo } from "./data";

type Props = {
	photos: Photo[];
};

/**
 * 中央の写真を大きく、前後の写真を左右の端から少し覗かせるカルーセル。
 * 端の写真やドットを押すとその写真が中央に来る。
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
		<div className="flex w-full flex-col items-center gap-5">
			<div className="flex w-full items-center justify-center gap-[27px] overflow-hidden py-2">
				{hasSides && (
					<button
						type="button"
						onClick={() => move(-1)}
						aria-label="前の写真"
						className="shrink-0 cursor-pointer opacity-50"
					>
						<FramedImage src={at(-1).src} alt="" width={240} height={160} />
					</button>
				)}
				{/* 左右の写真が10pxずつ覗く幅（最大280px）にし、狭い画面では中央の写真を縮めて左右を覗かせる */}
				<div
					className={`max-w-[280px] shrink-0 rounded-[12px] shadow-[0_6px_0_0_var(--brand-yellow)] ${
						hasSides ? "w-[calc(100%-74px)]" : "w-full"
					}`}
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
						className="shrink-0 cursor-pointer opacity-50"
					>
						<FramedImage src={at(1).src} alt="" width={240} height={160} />
					</button>
				)}
			</div>
			{hasSides && (
				<CarouselDots count={count} index={index} onSelect={setIndex} />
			)}
		</div>
	);
}
