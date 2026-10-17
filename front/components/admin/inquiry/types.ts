import type { InquiryStatus } from "@/lib/validation/schemas";

/** GET /api/inquiry・GET /api/inquiry/:id が返す問い合わせ（back/src/db/schema.ts の inquiry） */
export type Inquiry = {
	id: string;
	name: string;
	email: string | null;
	title: string;
	body: string;
	img_url: string | null;
	status: InquiryStatus;
	created_at: string;
};

/** 問い合わせへの返信（GET /api/inquiry/:id の replies） */
export type InquiryReply = {
	id: string;
	title: string;
	body: string;
	admin_name: string;
	img_url: string | null;
	file_url: string | null;
	/** 問い合わせ元へ返信メールが届いた日時。未送信・送信失敗・メールアドレスなしは null */
	mail_sent_at: string | null;
	created_at: string;
};

/**
 * POST /api/inquiry/:id/reply の mail_status（返信メールの送信結果）。
 * sent: 送信済み / failed: 送信失敗（詳細から再送できる） / no_address: 問い合わせにメールアドレスが無く送っていない
 */
export type ReplyMailStatus = "sent" | "failed" | "no_address";

export type InquiryDetailData = Inquiry & { replies: InquiryReply[] };

/** 一覧のタブ。all は絞り込みなし */
export type InquiryTab = InquiryStatus | "all";

/** GET /api/inquiry の counts（検索語だけで数えたステータスごとの件数。タブに出す） */
export type InquiryCounts = Record<InquiryTab, number>;

/** 一覧の検索語の上限（back の inquiry/getAll.ts の SEARCH_MAX_LENGTH） */
export const INQUIRY_SEARCH_MAX_LENGTH = 100;

/** ISO日時を YYYY/MM/DD にする */
export const formatDate = (iso: string) => {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};
