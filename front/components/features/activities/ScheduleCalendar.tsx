"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { activitySlots } from "./data";
import { PracticeDayDialog } from "./PracticeDayDialog";
import { toDateValue } from "./practiceDates";
import { type ScheduleEvent, scheduleLabel } from "./scheduleEvents";

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

/** 今日は外部から変化を通知しないため購読は不要 */
const subscribeNothing = () => () => {};

/** 同じ日なら同じ値を返す（useSyncExternalStore のスナップショットとして安定させる） */
function getTodayKey(): string {
	const now = new Date();
	return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

function parseTodayKey(key: string): YearMonth & { date: number } {
	const [year, month, date] = key.split("-").map(Number);
	return { year, month, date };
}

type Props = {
	/** カレンダー（Google / iCloud）から取り込んだ予定。null なら活動日時の曜日に印を付ける */
	events: ScheduleEvent[] | null;
};

/**
 * 月表示の練習カレンダー（Figma: calendar 1030:376）。
 * 予定のある日に黄色の丸を付け、日付の下に体育館名・大会名を表示する（長い名前は2行で「…」に省略）。
 * 予定の日をタップすると、時間・場所・体験フォームへの導線をモーダルで表示する。
 */
export function ScheduleCalendar({ events }: Props) {
	// 表示月はビルド時と閲覧時でずれるため、今日はクライアントでのみ取得する（サーバーでは null）
	const todayKey = useSyncExternalStore(
		subscribeNothing,
		getTodayKey,
		() => null,
	);
	const today = todayKey ? parseTodayKey(todayKey) : null;
	// 今月からの表示月のずれ
	const [offset, setOffset] = useState(0);
	const [selected, setSelected] = useState<Date | null>(null);

	const eventsByDate = useMemo(() => {
		const map = new Map<string, ScheduleEvent[]>();
		for (const event of events ?? []) {
			map.set(event.date, [...(map.get(event.date) ?? []), event]);
		}
		return map;
	}, [events]);
	const selectedEvents =
		events && selected ? (eventsByDate.get(toDateValue(selected)) ?? []) : null;

	const current: YearMonth | null = today
		? (() => {
				const date = new Date(today.year, today.month + offset, 1);
				return { year: date.getFullYear(), month: date.getMonth() };
			})()
		: null;

	const move = (diff: number) => setOffset((prev) => prev + diff);

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
			<div className="grid grid-cols-7 gap-y-3 text-center text-[15px] leading-[22px]">
				{weekdays.map((day, i) => (
					<span key={day} className={i === 0 ? "text-brand-red" : undefined}>
						{day}
					</span>
				))}
				{current &&
					buildCells(current).map((cell, i) => {
						if (cell.date === null) return <span key={cell.key} />;
						const date = new Date(current.year, current.month, cell.date);
						const dayEvents = events
							? (eventsByDate.get(toDateValue(date)) ?? [])
							: [];
						// カレンダー未連携のときは活動日時の曜日を練習日とする
						const isMarked = events
							? dayEvents.length > 0
							: practiceDays.has(i % 7);
						const label = dayEvents[0] ? scheduleLabel(dayEvents[0]) : null;
						const isToday =
							today !== null &&
							cell.date === today.date &&
							current.year === today.year &&
							current.month === today.month;
						const circleClass = `mx-auto flex size-[clamp(30px,10vw,40px)] shrink-0 items-center justify-center rounded-full ${
							isMarked ? "bg-brand-yellow font-medium" : ""
						} ${isToday ? "border-2 border-brand-red" : ""}`;
						const content = (
							<>
								<span className={circleClass}>{cell.date}</span>
								{label && (
									<span
										className={`w-full px-0.5 text-[10px] leading-[12px] font-medium tracking-normal break-all ${
											dayEvents.length > 1 ? "line-clamp-1" : "line-clamp-2"
										}`}
									>
										{label}
									</span>
								)}
								{/* 同じ日に複数の予定があるときは、1件目の名前と残りの件数を出す */}
								{dayEvents.length > 1 && (
									<span className="text-[10px] leading-[12px] tracking-normal">
										{`+${dayEvents.length - 1}件`}
									</span>
								)}
							</>
						);
						if (isMarked) {
							const names = dayEvents.map(scheduleLabel).join("、");
							return (
								<button
									key={cell.key}
									type="button"
									onClick={() => setSelected(date)}
									aria-current={isToday ? "date" : undefined}
									aria-label={`${current.month + 1}月${cell.date}日${names ? ` ${names}` : ""} 詳細を見る`}
									className="flex min-w-0 cursor-pointer flex-col items-center gap-0.5 active:opacity-70"
								>
									{content}
								</button>
							);
						}
						return (
							<span
								key={cell.key}
								aria-current={isToday ? "date" : undefined}
								className="flex min-w-0 flex-col items-center"
							>
								{content}
							</span>
						);
					})}
			</div>
			<p className="flex items-center gap-1 self-end text-[12px] leading-4">
				<span aria-hidden className="size-3 rounded-full bg-brand-yellow" />
				{events ? "予定あり" : "練習日"}（タップで詳細）
			</p>
			<PracticeDayDialog
				date={selected}
				events={selectedEvents}
				onClose={() => setSelected(null)}
			/>
		</div>
	);
}
