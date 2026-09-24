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
	created_at: string;
};

export type InquiryDetailData = Inquiry & { replies: InquiryReply[] };

/** ISO日時を YYYY/MM/DD にする */
export const formatDate = (iso: string) => {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};
