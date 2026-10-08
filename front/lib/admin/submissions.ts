// 関係者（member）からの投稿申請（back/src/submission/index.ts）の型。
// 申請の実体は news テーブル（type='news'）の行で、承認待ちは status='pending'。
// 承認すると 'published' になり公開サイトのニュースに出る。差し戻すと 'draft' に戻る。

/** GET /api/submissions/pending の1件（使う項目だけ） */
export type Submission = {
	id: string;
	title: string;
	body: string;
	category: string | null;
	/** 公開範囲。投稿申請は常に 'public'（承認されると誰でも見られる） */
	visibility: "public" | "member";
	status: "draft" | "pending" | "published";
	created_at: string;
	/** 申請した人（アカウント削除済みなら「元管理者」） */
	admin_name: string;
	/** 添付画像の署名付きURL（画像なしなら null） */
	img_url: string | null;
};

/** 承認・差し戻しの操作（PATCH /api/submissions/:id/approve・/reject） */
export type SubmissionDecision = "approve" | "reject";

/** ISO日時を YYYY/MM/DD HH:mm にする */
export const formatSubmissionDate = (iso: string) => {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
