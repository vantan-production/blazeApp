/** カレンダー（Google / iCloud の公開ICS）から取り込んだ予定の1日分 */
export type ScheduleEvent = {
	/** 予定のある日（YYYY-MM-DD、日本時間）。複数日にまたがる予定は日ごとに分ける */
	date: string;
	title: string;
	/** カレンダーの「場所」。未入力なら null */
	location: string | null;
	/** 例: "18:30~21:00"。終日予定や複数日にまたがる予定の途中の日は null */
	time: string | null;
};

/** 住所付きの場所（例: "西尾市立矢田小学校, 〒444-0313 …"）から施設名だけを取り出す */
function placeName(location: string): string {
	return location.split(/[,，、\n]|〒/)[0].trim();
}

const CANCELLED = /[【［[(（]?中止[】］\])）]?/;

/** 予定名に「中止」の印が付いているか（例: 「〇〇カップ【中止】」） */
export function isCancelledEvent(event: ScheduleEvent): boolean {
	return CANCELLED.test(event.title);
}

/**
 * 体験の申し込みを案内できる日か。チームの通常の練習（「通常練習」「体験会」）だけを対象にし、
 * 自主練習・練習試合・大会などの日には案内しない
 */
export function isTrialEvent(event: ScheduleEvent): boolean {
	return !isCancelledEvent(event) && /通常練習|体験会/.test(event.title);
}

/**
 * カレンダーのマスに出す短い名前。
 * 練習（「練習」を含み「試合」を含まない予定）は体育館名、それ以外（練習試合・大会など）は予定名にする。
 * マスは狭いため「西尾市立」「第30回」などの頭を省き、「〇〇小学校」は「〇〇小」に縮める（モーダルでは省かずに表示する）。
 * 中止の予定は、省略されても分かるよう先頭に「中止」を付ける
 */
export function scheduleLabel(event: ScheduleEvent): string {
	const cancelled = isCancelledEvent(event);
	const title = event.title.replace(CANCELLED, "").trim();
	const place = event.location ? placeName(event.location) : "";
	const isPractice = title.includes("練習") && !title.includes("試合");
	const label = (place && isPractice ? place : title)
		.replace(/^.{1,4}?[市町村]立/, "")
		.replace(/^第[0-9０-９]+回\s*/, "")
		.replace(/([小中])学校$/, "$1")
		.trim();
	return cancelled ? `中止 ${label}` : label;
}

/** 場所をGoogleマップで検索するURL */
export function mapSearchUrl(location: string): string {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
