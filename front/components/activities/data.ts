/** 活動日時の1行（曜日は Date#getDay() の値: 0=日〜6=土） */
export type ActivitySlot = {
	label: string;
	days: number[];
	time: string;
};

/** 対象学年（Figma: Frame 78） */
export const activityGrade = "小学1年生〜小学6年生";

/** 活動日時（Figma: Frame 38 980:338）。カレンダーの練習日表示にも使う */
export const activitySlots: ActivitySlot[] = [
	{ label: "火曜、木曜", days: [2, 4], time: "18:30~21:00" },
	{ label: "土曜、日曜", days: [6, 0], time: "13:00~17:00" },
];

/** 活動場所（Figma: Frame 85 980:345） */
export const activityPlace = {
	name: "XXX学校",
	// TODO: 地図・施設情報のURLが決まったら差し替える
	links: [
		{ label: "地図を見る", href: "#" },
		{ label: "施設情報を見る", href: "#" },
	],
};

/** 持ち物（Figma: Frame 91 980:365） */
export const belongings = ["上履き", "水筒", "タオル", "動きやすい服"];

export type Notice = { id: string; date: string; text: string };

/** 保護者の方への連絡事項（Figma: all-news 980:384）。API接続までの仮データ */
export const notices: Notice[] = [
	{
		id: "1",
		date: "xxx/yy/zz",
		text: "テキストテキストテキストテキストテキストテキストテキストテキスト",
	},
	{
		id: "2",
		date: "xxx/yy/zz",
		text: "テキストテキストテキストテキストテキストテキストテキストテキスト",
	},
	{
		id: "3",
		date: "xxx/yy/zz",
		text: "テキストテキストテキストテキストテキストテキストテキストテキスト",
	},
];
