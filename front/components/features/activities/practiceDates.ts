import { activitySlots } from "./data";

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

/** 体験希望日の選択肢を何日先まで出すか */
const PRACTICE_DATE_RANGE_DAYS = 56;

export type PracticeDateOption = {
	/** back に送る値（YYYY-MM-DD） */
	value: string;
	/** プルダウンの表示（例: 10月10日（土） 13:00~17:00） */
	label: string;
};

/** ローカル日付を YYYY-MM-DD にする（toISOString は UTC になり日付がずれるため使わない） */
export function toDateValue(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * today の翌日から一定期間の練習日（活動日時の曜日）を、体験希望日の選択肢にする。
 * 当日の申し込みは受け付けないため today は含めない。
 * TODO: 大会・休みなどの予定データがAPIから取れるようになったら、それを反映する
 */
export function upcomingPracticeDates(today: Date): PracticeDateOption[] {
	const options: PracticeDateOption[] = [];
	for (let i = 1; i <= PRACTICE_DATE_RANGE_DAYS; i++) {
		const date = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate() + i,
		);
		const slot = activitySlots.find((s) => s.days.includes(date.getDay()));
		if (!slot) continue;
		options.push({
			value: toDateValue(date),
			label: `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}） ${slot.time}`,
		});
	}
	return options;
}
