"use client";

import { useState } from "react";
import { AchievementCard } from "./AchievementCard";
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
			<div aria-live="polite" className="w-full">
				<AchievementCard
					imageSrc={item.imageSrc}
					title={item.title}
					number={index + 1}
				/>
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
