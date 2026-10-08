// 体験申し込み（/api/trial-application）の型と、画面表示用の変換関数。
// 項目の意味は back/src/db/schema.ts の trialApplication、選択肢の文言は back/src/utils/mail.ts の確認メールに合わせる。

export type TrialGender = "male" | "female" | "other";
export type TrialMotivation = "flyer" | "instagram" | "referral" | "other";

/** GET /api/trial-application（一覧）・GET /api/trial-application/:id（詳細）が返す体験申し込み */
export type TrialApplication = {
	id: string;
	/** 申し込み日時（ISO） */
	created_at: string;
	email: string;
	/** 体験希望日（YYYY-MM-DD） */
	trial_date: string;
	name: string;
	furigana: string;
	gender: TrialGender;
	/** 生年月日（YYYY-MM-DD） */
	birth_date: string;
	school_name: string;
	cram_school: string | null;
	phone_number: string;
	motivation: TrialMotivation;
	/** きっかけが「その他」のときの自由記述 */
	motivation_other: string | null;
	/** きっかけが「紹介」のときの紹介者名（任意） */
	referrer_name: string | null;
};

export const trialGenderLabel: Record<TrialGender, string> = {
	male: "男性",
	female: "女性",
	other: "その他",
};

export const trialMotivationLabel: Record<TrialMotivation, string> = {
	flyer: "学校で配布されたチラシ",
	instagram: "インスタグラム",
	referral: "西尾ブレイズの選手、スタッフからの紹介",
	other: "その他",
};

/** 想定外の値が来ても画面が壊れないよう、ラベルが無ければ値をそのまま出す */
export const labelOf = <K extends string>(
	labels: Record<K, string>,
	value: string,
) => (value in labels ? labels[value as K] : value);

type YMD = { y: number; m: number; d: number };

/** YYYY-MM-DD を数値に分ける（new Date に渡すと UTC 扱いで日付がずれうるため自前で読む） */
const parseYmd = (value: string): YMD | null => {
	const [y, m, d] = value.slice(0, 10).split("-").map(Number);
	if (!y || !m || !d) return null;
	return { y, m, d };
};

const pad = (n: number) => String(n).padStart(2, "0");
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 日付（YYYY-MM-DD）を 2026/09/28(月) にする */
export const formatDateWithWeekday = (value: string) => {
	const ymd = parseYmd(value);
	if (!ymd) return value;
	const weekday =
		WEEKDAYS[new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay()];
	return `${ymd.y}/${pad(ymd.m)}/${pad(ymd.d)}(${weekday})`;
};

/** 日付（YYYY-MM-DD）を 2016/05/03 にする */
export const formatDate = (value: string) => {
	const ymd = parseYmd(value);
	return ymd ? `${ymd.y}/${pad(ymd.m)}/${pad(ymd.d)}` : value;
};

const jstDateFormat = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

const jstDateTimeFormat = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
});

/** 申し込み日時（ISO）を日本時間の 2026/09/24 にする */
export const formatAppliedDate = (iso: string) => {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? iso : jstDateFormat.format(date);
};

/** 申し込み日時（ISO）を日本時間の 2026/09/24 17:56 にする */
export const formatAppliedAt = (iso: string) => {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? iso : jstDateTimeFormat.format(date);
};

/** 今日の日付（日本時間） */
const todayInJapan = (): YMD => {
	const parts = jstDateFormat.formatToParts(new Date());
	const get = (type: string) =>
		Number(parts.find((part) => part.type === type)?.value);
	return { y: get("year"), m: get("month"), d: get("day") };
};

/** 今日時点の満年齢 */
export const ageOf = (birthDate: string): number | null => {
	const birth = parseYmd(birthDate);
	if (!birth) return null;
	const today = todayInJapan();
	const hadBirthday =
		today.m > birth.m || (today.m === birth.m && today.d >= birth.d);
	return today.y - birth.y - (hadBirthday ? 0 : 1);
};

/**
 * 生年月日から今年度の学年を計算する（例: 小3・中1）。
 * 4月2日〜翌4月1日生まれが同じ学年（4月1日生まれは早生まれ扱い）。飛び級・留年などは考えない目安
 */
export const schoolGradeOf = (birthDate: string): string | null => {
	const birth = parseYmd(birthDate);
	if (!birth) return null;
	// 誕生日の前日で数えると、4月1日生まれが前の学年に入る
	const dayBefore = new Date(Date.UTC(birth.y, birth.m - 1, birth.d - 1));
	const entryYear =
		dayBefore.getUTCMonth() >= 3
			? dayBefore.getUTCFullYear() + 7
			: dayBefore.getUTCFullYear() + 6;
	const today = todayInJapan();
	const schoolYear = today.m >= 4 ? today.y : today.y - 1;
	const grade = schoolYear - entryYear + 1;
	if (grade <= 0) return "未就学";
	if (grade <= 6) return `小${grade}`;
	if (grade <= 9) return `中${grade - 6}`;
	if (grade <= 12) return `高${grade - 9}`;
	return null;
};

/** 体験希望日が今日より前か（一覧で「体験日を過ぎた申し込み」を見分ける） */
export const isPastTrialDate = (trialDate: string) => {
	const ymd = parseYmd(trialDate);
	if (!ymd) return false;
	const today = todayInJapan();
	const key = (v: YMD) => v.y * 10000 + v.m * 100 + v.d;
	return key(ymd) < key(today);
};
