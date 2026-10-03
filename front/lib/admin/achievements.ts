/** GET /api/achievement の一覧に並ぶ実績（back/src/achievement/getAll.ts から使う項目だけ） */
export type AchievementPost = {
	id: string;
	title: string;
	body: string;
	/** 添付した画像・動画・ファイルの署名付きURL（添付していない種類は null） */
	img_url: string | null;
	movie_url: string | null;
	file_url: string | null;
	created_at: string;
};

/** ISO日時を YYYY/MM/DD にする */
export const formatAchievementDate = (iso: string) => {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};
