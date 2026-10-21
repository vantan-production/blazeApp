// 体験申込者への連絡メール（/api/trial-notices）の型と、画面表示用の小さな変換関数。
// 画面側のロジックを追いやすくするため、API レスポンスの解釈はなるべくここに寄せる。

/** GET /api/trial-notices/candidates が返す宛先候補（体験申込） */
export type TrialCandidate = {
	id: string;
	name: string;
	furigana: string;
	email: string;
	/** YYYY-MM-DD */
	trial_date: string;
	created_at: string;
};

/** 送信結果・送信履歴に載る宛先 */
export type TrialNoticeRecipient = {
	application_id: string;
	name: string;
	email: string;
	trial_date: string;
};

/** 送信履歴（back の trial_notices） */
export type TrialNotice = {
	id: string;
	title: string;
	body: string;
	recipient_count: number;
	admin_id: string;
	created_at: string;
	updated_at: string;
};

/** GET /api/trial-notices の一覧の一件 */
export type TrialNoticeListItem = TrialNotice & { admin_name: string };

/** GET /api/trial-notices/:id */
export type TrialNoticeDetailData = TrialNoticeListItem & {
	recipients: (TrialNoticeRecipient & { sent_at: string })[];
};

/**
 * POST /api/trial-notices の data。
 * 全員失敗（502）のときも同じ形で notice: null / failed に全員が入って返る
 */
export type TrialNoticeSendResult = {
	notice: TrialNotice | null;
	sent: TrialNoticeRecipient[];
	failed: TrialNoticeRecipient[];
};

/** 一度に送れる宛先の上限（back の application_ids の上限と同じ） */
export const MAX_RECIPIENTS = 100;

/** エラーボディ（502）の data が送信結果の形になっているか確かめる */
export const pickSendResult = (body: unknown): TrialNoticeSendResult | null => {
	if (!body || typeof body !== "object") return null;
	const data = (body as { data?: unknown }).data;
	if (!data || typeof data !== "object") return null;
	const { failed, sent } = data as Partial<TrialNoticeSendResult>;
	if (!Array.isArray(failed) || !Array.isArray(sent)) return null;
	return data as TrialNoticeSendResult;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 体験日（YYYY-MM-DD）を 2026/09/28(月) にする。
 * 日付だけの値をそのまま new Date に渡すと UTC として解釈されて曜日がずれうるため、数値から組み立てる
 */
export const formatTrialDate = (value: string) => {
	const [y, m, d] = value.slice(0, 10).split("-").map(Number);
	if (!y || !m || !d) return value;
	const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
	return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}(${weekday})`;
};

const jstDateTimeFormat = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
});

/** 送信日時（ISO）を日本時間の 2026/09/24 17:56 にする（端末のタイムゾーンに左右されないように固定） */
export const formatSentAt = (iso: string) => {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return jstDateTimeFormat.format(date);
};

export type CandidateGroup = {
	trialDate: string;
	candidates: TrialCandidate[];
};

/** 宛先候補を体験日ごとにまとめ、体験日の早い順・同じ日は申込順に並べる */
export const groupByTrialDate = (
	candidates: TrialCandidate[],
): CandidateGroup[] => {
	const groups = new Map<string, TrialCandidate[]>();
	for (const candidate of candidates) {
		const key = candidate.trial_date.slice(0, 10);
		const list = groups.get(key) ?? [];
		list.push(candidate);
		groups.set(key, list);
	}
	return [...groups.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([trialDate, list]) => ({
			trialDate,
			candidates: [...list].sort((a, b) =>
				a.created_at.localeCompare(b.created_at),
			),
		}));
};
