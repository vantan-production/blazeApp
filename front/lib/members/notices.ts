/** GET /api/notices の1件（back/src/notice/getAll.ts。使う項目だけ） */
export type Notice = {
	id: string;
	title: string;
	body: string;
	category: string | null;
	/** メイン画像の署名付きURL（無ければ null） */
	img_url: string | null;
	admin_name: string;
	created_at: string;
	/** 自分の既読日時（未読なら null） */
	read_at: string | null;
	is_read: boolean;
};

/** GET /api/notices/:id（back/src/news/getById.ts。既読フラグは含まれない） */
export type NoticeDetail = Omit<Notice, "read_at" | "is_read"> & {
	/** 本文に添付された画像 */
	images: { id: string; url: string }[];
};
