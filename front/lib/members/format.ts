// 関係者ページの日付表示

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO日時を YYYY/MM/DD にする */
export const formatDate = (iso: string) => {
	const date = new Date(iso);
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};

/** ISO日時を YYYY/MM/DD HH:mm にする（アンケートの締切など、時刻まで知りたいもの） */
export const formatDateTime = (iso: string) => {
	const date = new Date(iso);
	return `${formatDate(iso)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
