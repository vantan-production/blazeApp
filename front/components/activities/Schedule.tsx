import { ScheduleCalendar } from "./ScheduleCalendar";

/** スケジュール見出し＋カレンダー（Figma: スケジュール 1030:373 / Frame 86 980:356） */
export function Schedule() {
	return (
		<section className="flex w-full flex-col gap-[23px] py-[10px]">
			<h2 className="px-[10px] py-5 text-[22px] leading-[22px] tracking-[1.5px]">
				スケジュール
			</h2>
			<div className="flex w-full justify-center p-5">
				<ScheduleCalendar />
			</div>
		</section>
	);
}
