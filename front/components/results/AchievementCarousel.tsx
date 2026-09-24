"use client";

import Image from "next/image";
import { useState } from "react";
import type { Achievement } from "./data";

type Props = {
	items: Achievement[];
};

/** 左右ボタンで切り替える実績スライダー（Figma: group 1362:372） */
export function AchievementCarousel({ items }: Props) {
	const [index, setIndex] = useState(0);
	const item = items[index];
	if (!item) return null;

	const move = (diff: number) =>
		setIndex((prev) => (prev + diff + items.length) % items.length);
	const canMove = items.length > 1;

	return (
		<div className="flex w-full items-center">
			<button
				type="button"
				onClick={() => move(-1)}
				disabled={!canMove}
				aria-label="前の実績"
				className="shrink-0 cursor-pointer disabled:cursor-default"
			>
				<Image
					src="/icons/chevron-left-tall.svg"
					alt=""
					width={32}
					height={160}
				/>
			</button>
			<div
				aria-live="polite"
				className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden border-y-2 border-brand-white py-4"
			>
				<div className="relative h-[194px] min-w-0 flex-1">
					<Image
						src={item.imageSrc}
						alt=""
						fill
						sizes="141px"
						className="object-cover"
					/>
				</div>
				<p className="min-w-0 flex-1 text-center text-[clamp(12px,3.98vw,16px)] leading-[1.3] whitespace-pre-line">
					{item.title}
				</p>
			</div>
			<button
				type="button"
				onClick={() => move(1)}
				disabled={!canMove}
				aria-label="次の実績"
				className="shrink-0 cursor-pointer disabled:cursor-default"
			>
				<Image
					src="/icons/chevron-right-tall.svg"
					alt=""
					width={32}
					height={160}
				/>
			</button>
		</div>
	);
}
