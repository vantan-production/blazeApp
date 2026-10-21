/**
 * 投稿申請の状態（back/src/submission/index.ts。実体は news.status）
 * pending: 承認待ち / published: 公開済み / draft: 差し戻し（管理者が見送った）
 */
export type SubmissionStatus = "draft" | "pending" | "published";

/** GET /api/submissions の1件（自分の申請。使う項目だけ） */
export type Submission = {
	id: string;
	title: string;
	body: string;
	category: string | null;
	img_url: string | null;
	status: SubmissionStatus;
	created_at: string;
	updated_at: string;
};

/** 申請状態の表示文言 */
export const submissionStatusLabel: Record<SubmissionStatus, string> = {
	pending: "承認待ち",
	published: "公開済み",
	draft: "差し戻し",
};
