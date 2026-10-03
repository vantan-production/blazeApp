/** GET /api/media の一覧に並ぶメディア情報（back/src/docs/components.ts の NewsPost から使う項目だけ） */
export type MediaPost = {
	id: string;
	title: string;
	body: string;
	/** サムネイル画像の署名付きURL（未設定なら null） */
	img_url: string | null;
	created_at: string;
};

/** ISO日時を YYYY/MM/DD にする */
export const formatMediaDate = (iso: string) => {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};
