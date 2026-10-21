/** GET /api/documents の1件（back/src/document/index.ts） */
export type MemberDocument = {
	id: string;
	title: string;
	description: string | null;
	category: string | null;
	admin_name: string;
	created_at: string;
	updated_at: string;
	/** S3 上のファイル名（無ければ null） */
	file_name: string | null;
	has_file: boolean;
};

/** GET /api/documents/:id/download */
export type DocumentDownload = {
	id: string;
	/** 署名付きURL（発行から expires_in 秒で失効） */
	url: string;
	file_name: string | null;
	expires_in: number;
};
