"use client";

import Image from "next/image";
import { useState } from "react";
import { CarouselDots } from "./CarouselDots";
import type { Achievement } from "./data";

type Props = {
	items: Achievement[];
};

/** 写真と大会名を白いカードで見せ、下の丸ボタンで切り替える実績スライダー */
export function AchievementCarousel({ items }: Props) {
	const [index, setIndex] = useState(0);
	const item = items[index];
	if (!item) return null;

	const move = (diff: number) =>
		setIndex((prev) => (prev + diff + items.length) % items.length);
	const canMove = items.length > 1;

	return (
		<div className="flex w-full flex-col items-center gap-4">
			<div
				aria-live="polite"
				className="flex w-full items-stretch gap-3 rounded-[20px] bg-brand-white p-3 text-brand-blue"
			>
				<div className="relative aspect-[3/4] w-[45%] shrink-0 overflow-hidden rounded-[12px] bg-brand-black">
					<Image
						src={item.imageSrc}
						alt=""
						fill
						sizes="180px"
						className="object-cover"
					/>
				</div>
				<div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
					<span className="self-start rounded-full bg-brand-red px-3 py-1 font-savate text-[12px] leading-none tracking-[2px] text-brand-white">
						{String(index + 1).padStart(2, "0")}
					</span>
					<p className="text-[clamp(13px,4vw,16px)] leading-[1.5] font-bold whitespace-pre-line">
						{item.title}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-4">
				<ArrowButton
					direction="left"
					onClick={() => move(-1)}
					disabled={!canMove}
				/>
				<CarouselDots count={items.length} index={index} onSelect={setIndex} />
				<ArrowButton
					direction="right"
					onClick={() => move(1)}
					disabled={!canMove}
				/>
			</div>
		</div>
	);
}

function ArrowButton({
	direction,
	onClick,
	disabled,
}: {
	direction: "left" | "right";
	onClick: () => void;
	disabled: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={direction === "left" ? "前の実績" : "次の実績"}
			className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-brand-yellow text-brand-blue disabled:cursor-default disabled:opacity-40"
		>
			<svg
				viewBox="0 0 24 24"
				width={20}
				height={20}
				fill="none"
				stroke="currentColor"
				strokeWidth={3}
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
				className={direction === "left" ? "-scale-x-100" : ""}
			>
				<path d="M9 5l7 7-7 7" />
			</svg>
		</button>
	);
}
