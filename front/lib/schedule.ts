import ICAL from "ical.js";
import { unstable_cache } from "next/cache";
import { activitySlots } from "@/components/features/activities/data";
import type { ScheduleEvent } from "@/components/features/activities/scheduleEvents";

/**
 * 予定を読み込むカレンダーの公開ICSのURL（Google: 「iCal形式の公開URL / 非公開URL」、iCloud: 公開カレンダーの webcal:// リンク）。
 * 未設定ならカレンダーには活動日時の曜日だけを表示する
 */
const SCHEDULE_ICAL_URL = process.env.SCHEDULE_ICAL_URL;

/** 取り込む期間（今月の何か月前〜何か月後まで） */
const MONTHS_BEFORE = 3;
const MONTHS_AFTER = 12;

/** 毎週の予定などの繰り返しを、取り込む期間内で展開する上限 */
const MAX_OCCURRENCES = 5000;

/**
 * 繰り返しをたどる回数の上限（壊れたデータで無限に回らないようにする）。
 * 期間より前の回もたどるため、何年も前から続く毎日の予定でも期間に届く大きさにする
 */
const MAX_ITERATIONS = 100_000;

/** ICSの取得を待つ上限。応答が無いときは諦めて曜日だけの表示にする */
const FETCH_TIMEOUT_MS = 10_000;

const jstFormatter = new Intl.DateTimeFormat("en-CA", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
});

const pad = (n: number) => String(n).padStart(2, "0");

/** ICAL.Time を日本時間の日付（YYYY-MM-DD）と時刻（HH:MM）にする */
function toJst(time: ICAL.Time): { date: string; hm: string } {
	// タイムゾーンの無い時刻（floating）や未知のタイムゾーンは日本時間の表記として扱う。
	// toJSDate はサーバーのタイムゾーン（Vercel では UTC）で解釈してしまうため使わない
	if (!time.zone || time.zone.tzid === "floating") {
		return {
			date: `${time.year}-${pad(time.month)}-${pad(time.day)}`,
			hm: `${pad(time.hour)}:${pad(time.minute)}`,
		};
	}
	const parts = Object.fromEntries(
		jstFormatter
			.formatToParts(time.toJSDate())
			.map((part) => [part.type, part.value]),
	);
	return {
		date: `${parts.year}-${parts.month}-${parts.day}`,
		hm: `${parts.hour}:${parts.minute}`,
	};
}

const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};

/** HTMLの文字参照（&amp; など）を戻す。サークルスクエアのICSは「&」を &amp; のまま出力するため */
function decodeEntities(text: string): string {
	return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, name: string) => {
		if (name[0] !== "#") return ENTITIES[name.toLowerCase()] ?? match;
		const code =
			name[1].toLowerCase() === "x"
				? Number.parseInt(name.slice(2), 16)
				: Number(name.slice(1));
		return Number.isNaN(code) ? match : String.fromCodePoint(code);
	});
}

/**
 * 時間を入れずに終日で登録された平日（火・木）の予定に出す時間。
 * 平日の練習は活動日時（火曜、木曜 18:30~21:00）で固定のため、そこから引く
 */
const WEEKDAY_ALL_DAY_TIMES = new Map(
	activitySlots.flatMap((slot) =>
		slot.days
			.filter((day) => day >= 1 && day <= 5)
			.map((day) => [day, slot.time] as const),
	),
);

/** YYYY-MM-DD の曜日（0=日〜6=土） */
function weekdayOf(date: string): number {
	const [y, m, d] = date.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** YYYY-MM-DD の翌日 */
function nextDate(date: string): string {
	const [y, m, d] = date.split("-").map(Number);
	const next = new Date(Date.UTC(y, m - 1, d + 1));
	return next.toISOString().slice(0, 10);
}

/** 1回分の予定を、またがる日ごとの ScheduleEvent にする */
function toDailyEvents(
	item: ICAL.Event,
	start: ICAL.Time,
	end: ICAL.Time,
): ScheduleEvent[] {
	const title = decodeEntities(item.summary ?? "").trim() || "予定";
	const location = decodeEntities(item.location ?? "").trim() || null;

	if (start.isDate) {
		// 終日予定。DTEND はその日を含まない（1日だけなら翌日）
		const first = toJst(start).date;
		const last = end.compare(start) > 0 ? toJst(end).date : nextDate(first);
		// 1日だけの終日予定が火・木なら、平日の練習時間を出す（複数日の大会などはそのまま終日）
		if (nextDate(first) === last) {
			const time = WEEKDAY_ALL_DAY_TIMES.get(weekdayOf(first)) ?? null;
			return [{ date: first, title, location, time }];
		}
		const events: ScheduleEvent[] = [];
		for (let date = first; date < last; date = nextDate(date)) {
			events.push({ date, title, location, time: null });
		}
		return events;
	}

	const from = toJst(start);
	// 終了ちょうど0時の予定が翌日にはみ出さないよう、終了日は1分前で判定する
	const endMinus = end.clone();
	endMinus.adjust(0, 0, -1, 0);
	const to = toJst(end);
	const lastDate = end.compare(start) > 0 ? toJst(endMinus).date : from.date;
	if (lastDate === from.date) {
		const time = end.compare(start) > 0 ? `${from.hm}~${to.hm}` : from.hm;
		return [{ date: from.date, title, location, time }];
	}
	const events: ScheduleEvent[] = [];
	for (let date = from.date; date <= lastDate; date = nextDate(date)) {
		const time =
			date === from.date
				? `${from.hm}~`
				: date === lastDate
					? `~${to.hm}`
					: null;
		events.push({ date, title, location, time });
	}
	return events;
}

/** ICS本文から、期間内（YYYY-MM-DD の from〜to）の予定を日ごとに取り出して日時順に並べる */
export function parseScheduleEvents(
	ics: string,
	from: string,
	to: string,
): ScheduleEvent[] {
	const root = new ICAL.Component(ICAL.parse(ics));
	for (const vtimezone of root.getAllSubcomponents("vtimezone")) {
		ICAL.TimezoneService.register(vtimezone);
	}

	// 繰り返し予定の一部だけ変更した回（RECURRENCE-ID 付き）は、元の予定に紐づけて展開時に差し替える
	const events: ICAL.Event[] = [];
	const masters = new Map<string, ICAL.Event>();
	const exceptions: ICAL.Event[] = [];
	for (const vevent of root.getAllSubcomponents("vevent")) {
		const event = new ICAL.Event(vevent);
		if (event.isRecurrenceException()) {
			exceptions.push(event);
		} else {
			events.push(event);
			masters.set(event.uid, event);
		}
	}
	for (const exception of exceptions) {
		const master = masters.get(exception.uid);
		if (master) master.relateException(exception);
		else events.push(exception);
	}

	const isCancelled = (event: ICAL.Event) =>
		String(event.component.getFirstPropertyValue("status")).toUpperCase() ===
		"CANCELLED";

	const daily: ScheduleEvent[] = [];
	for (const event of events) {
		if (!event.isRecurring()) {
			if (!isCancelled(event)) {
				daily.push(...toDailyEvents(event, event.startDate, event.endDate));
			}
			continue;
		}
		const iterator = event.iterator();
		let occurrences = 0;
		for (let i = 0; i < MAX_ITERATIONS && occurrences < MAX_OCCURRENCES; i++) {
			const next = iterator.next();
			if (!next) break;
			const details = event.getOccurrenceDetails(next);
			if (toJst(details.startDate).date > to) break;
			// 期間より前に終わる回は、期間内の回の上限に数えずに飛ばす
			if (toJst(details.endDate).date < from) continue;
			occurrences++;
			if (isCancelled(details.item)) continue;
			daily.push(
				...toDailyEvents(details.item, details.startDate, details.endDate),
			);
		}
	}

	return daily
		.filter((event) => event.date >= from && event.date <= to)
		.sort(
			(a, b) =>
				a.date.localeCompare(b.date) ||
				(a.time ?? "").localeCompare(b.time ?? ""),
		);
}

/** 取り込む期間（今月の MONTHS_BEFORE か月前の1日〜 MONTHS_AFTER か月後の月末） */
function scheduleRange(): { from: string; to: string } {
	const [y, m] = toJst(ICAL.Time.now()).date.split("-").map(Number);
	const from = new Date(Date.UTC(y, m - 1 - MONTHS_BEFORE, 1));
	const to = new Date(Date.UTC(y, m + MONTHS_AFTER, 0));
	return {
		from: from.toISOString().slice(0, 10),
		to: to.toISOString().slice(0, 10),
	};
}

/**
 * カレンダーのICSを取得して解析する（1時間キャッシュ）。
 * ICS本体は大きくなりやすいため fetch ではキャッシュせず、期間で絞った解析結果だけをキャッシュする。
 * 失敗時は例外にしてキャッシュさせない
 */
const loadScheduleEvents = unstable_cache(
	async (url: string): Promise<ScheduleEvent[]> => {
		// iCloud の共有リンクは webcal:// のため https:// に読み替える
		const res = await fetch(url.replace(/^webcal:\/\//, "https://"), {
			cache: "no-store",
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		if (!res.ok)
			throw new Error(`カレンダーの取得に失敗しました: ${res.status}`);
		const { from, to } = scheduleRange();
		return parseScheduleEvents(await res.text(), from, to);
	},
	["schedule-events"],
	{ revalidate: 3600 },
);

/**
 * カレンダーの予定を取得する。URL未設定・取得や解析に失敗した場合は null
 * （呼び出し側は活動日時の曜日だけの表示に切り替える）
 */
export async function fetchScheduleEvents(): Promise<ScheduleEvent[] | null> {
	if (!SCHEDULE_ICAL_URL) return null;
	try {
		return await loadScheduleEvents(SCHEDULE_ICAL_URL);
	} catch (error) {
		console.error(error);
		return null;
	}
}
