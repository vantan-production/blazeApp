"use client";

import { useEffect, useState } from "react";
import { activitySlots } from "./data";

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

/** 練習のある曜日（活動日時から算出） */
const practiceDays = new Set(activitySlots.flatMap((slot) => slot.days));

type YearMonth = { year: number; month: number };

type Cell = { key: string; date: number | null };

/** 指定月のカレンダーのマス（月初より前の空白は date=null）を作る */
function buildCells({ year, month }: YearMonth): Cell[] {
	const firstDay = new Date(year, month, 1).getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	return [
		...Array.from({ length: firstDay }, (_, i) => ({
			key: `blank-${i}`,
			date: null,
		})),
		...Array.from({ length: daysInMonth }, (_, i) => ({
			key: `day-${i + 1}`,
			date: i + 1,
		})),
	];
}

/**
 * 月表示の練習カレンダー（Figma: calendar 1030:376）。
 * Figmaでは362x240のグレー枠のみのため、活動日時の曜日に印を付ける仮実装。
 * TODO: 大会・休みなどの予定データが決まったらAPIから取得して表示する
 */
export function ScheduleCalendar() {
	// 表示月はビルド時と閲覧時でずれるため、マウント後に今月をセットする
	const [current, setCurrent] = useState<YearMonth | null>(null);

	useEffect(() => {
		const now = new Date();
		setCurrent({ year: now.getFullYear(), month: now.getMonth() });
	}, []);

	const move = (diff: number) =>
		setCurrent((prev) => {
			if (!prev) return prev;
			const date = new Date(prev.year, prev.month + diff, 1);
			return { year: date.getFullYear(), month: date.getMonth() };
		});

	return (
		<div className="flex min-h-[240px] w-full max-w-[362px] flex-col gap-2 rounded-[8px] bg-brand-white p-3 text-brand-blue">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => move(-1)}
					aria-label="前の月"
					className="size-8 cursor-pointer text-[20px] leading-none"
				>
					‹
				</button>
				<p
					aria-live="polite"
					className="text-[16px] leading-[22px] font-medium tracking-[1px]"
				>
					{current ? `${current.year}年${current.month + 1}月` : ""}
				</p>
				<button
					type="button"
					onClick={() => move(1)}
					aria-label="次の月"
					className="size-8 cursor-pointer text-[20px] leading-none"
				>
					›
				</button>
			</div>
			<div className="grid grid-cols-7 gap-y-1 text-center text-[12px] leading-[22px]">
				{weekdays.map((day, i) => (
					<span key={day} className={i === 0 ? "text-brand-red" : undefined}>
						{day}
					</span>
				))}
				{current &&
					buildCells(current).map((cell, i) => (
						<span
							key={cell.key}
							className={`mx-auto flex size-[22px] items-center justify-center rounded-full ${
								cell.date !== null && practiceDays.has(i % 7)
									? "bg-brand-yellow"
									: ""
							}`}
						>
							{cell.date}
						</span>
					))}
			</div>
			<p className="mt-auto flex items-center gap-1 self-end text-[11px] leading-4">
				<span aria-hidden className="size-3 rounded-full bg-brand-yellow" />
				練習日
			</p>
		</div>
	);
}
