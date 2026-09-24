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
	name: "西尾市立矢田小学校",
	// TODO: 地図・施設情報のURLが決まったら差し替える
	links: [
		{
			label: "地図を見る",
			href: "https://www.google.com/maps/dir//%E8%A5%BF%E5%B0%BE%E5%B8%82%E7%AB%8B%E7%9F%A2%E7%94%B0%E5%B0%8F%E5%AD%A6%E6%A0%A1%E3%80%81%E3%80%92444-0313+%E6%84%9B%E7%9F%A5%E7%9C%8C%E8%A5%BF%E5%B0%BE%E5%B8%82%E4%B8%8A%E7%9F%A2%E7%94%B0%E7%94%BA%E7%A5%9E%E6%98%8E%E5%AF%BA%EF%BC%92%EF%BC%94/@34.8754998,137.0680353,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x60049112215c70c7:0xbb7cbb96ad0aa78b!2m2!1d137.0303699!2d34.8544373?entry=ttu&g_ep=EgoyMDI2MDkyMS4wIKXMDSoASAFQAw%3D%3D",
		},
		{
			label: "施設情報を見る",
			href: "https://www.nishio.ed.jp/yata-sho/index.html",
		},
	],
};

/** 持ち物（Figma: Frame 91 980:365） */
export const belongings = ["シューズ", "水筒", "タオル", "動きやすい服"];

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
