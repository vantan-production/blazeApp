import type { NoticeStatus } from "./notices";

/** GET /api/news-post の一覧に並ぶお知らせ（back/src/docs/components.ts の NewsPost から使う項目だけ） */
export type NewsPost = {
	id: string;
	title: string;
	body: string;
	category: string | null;
	/** サムネイル画像の署名付きURL（未設定なら null） */
	img_url: string | null;
	/** 公開状態。published 以外（関係者からの申請の承認待ちなど）は公開サイトに出ない */
	status: NoticeStatus;
	created_at: string;
};

/** GET /api/news-post/:id のお知らせ。本文に載せた画像も付く */
export type NewsPostDetail = NewsPost & {
	images: { id: string; url: string }[];
};

/** ISO日時を YYYY/MM/DD にする */
export const formatNewsDate = (iso: string) => {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};
