"use client";

import { useEffect, useState } from "react";
import { activitySlots } from "./data";
import { PracticeDayDialog } from "./PracticeDayDialog";

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
 * 練習日をタップすると、練習時間・場所・体験フォームへの導線をモーダルで表示する。
 * TODO: 大会・休みなどの予定データが決まったらAPIから取得して表示する
 */
export function ScheduleCalendar() {
	// 表示月はビルド時と閲覧時でずれるため、マウント後に今月をセットする
	const [current, setCurrent] = useState<YearMonth | null>(null);
	const [selected, setSelected] = useState<Date | null>(null);
	const [today, setToday] = useState<(YearMonth & { date: number }) | null>(
		null,
	);

	useEffect(() => {
		const now = new Date();
		setCurrent({ year: now.getFullYear(), month: now.getMonth() });
		setToday({
			year: now.getFullYear(),
			month: now.getMonth(),
			date: now.getDate(),
		});
	}, []);

	const move = (diff: number) =>
		setCurrent((prev) => {
			if (!prev) return prev;
			const date = new Date(prev.year, prev.month + diff, 1);
			return { year: date.getFullYear(), month: date.getMonth() };
		});

	return (
		<div className="flex w-full flex-col gap-3 rounded-[20px] bg-brand-white p-4 text-brand-blue">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => move(-1)}
					aria-label="前の月"
					className="size-10 cursor-pointer text-[26px] leading-none"
				>
					‹
				</button>
				<p
					aria-live="polite"
					className="text-[20px] leading-[22px] font-medium tracking-[1px]"
				>
					{current ? `${current.year}年${current.month + 1}月` : ""}
				</p>
				<button
					type="button"
					onClick={() => move(1)}
					aria-label="次の月"
					className="size-10 cursor-pointer text-[26px] leading-none"
				>
					›
				</button>
			</div>
			<div className="grid grid-cols-7 gap-y-2 text-center text-[15px] leading-[22px]">
				{weekdays.map((day, i) => (
					<span key={day} className={i === 0 ? "text-brand-red" : undefined}>
						{day}
					</span>
				))}
				{current &&
					buildCells(current).map((cell, i) => {
						const isToday =
							today !== null &&
							cell.date === today.date &&
							current.year === today.year &&
							current.month === today.month;
						const isPractice = cell.date !== null && practiceDays.has(i % 7);
						const cellClass = `mx-auto flex size-[clamp(30px,10vw,40px)] items-center justify-center rounded-full ${
							isPractice ? "bg-brand-yellow font-medium" : ""
						} ${isToday ? "border-2 border-brand-red" : ""}`;
						if (isPractice && cell.date !== null) {
							const date = new Date(current.year, current.month, cell.date);
							return (
								<button
									key={cell.key}
									type="button"
									onClick={() => setSelected(date)}
									aria-current={isToday ? "date" : undefined}
									aria-label={`${current.month + 1}月${cell.date}日 練習日の詳細を見る`}
									className={`${cellClass} cursor-pointer active:opacity-70`}
								>
									{cell.date}
								</button>
							);
						}
						return (
							<span
								key={cell.key}
								aria-current={isToday ? "date" : undefined}
								className={cellClass}
							>
								{cell.date}
							</span>
						);
					})}
			</div>
			<p className="flex items-center gap-1 self-end text-[12px] leading-4">
				<span aria-hidden className="size-3 rounded-full bg-brand-yellow" />
				練習日（タップで詳細）
			</p>
			<PracticeDayDialog date={selected} onClose={() => setSelected(null)} />
		</div>
	);
}
