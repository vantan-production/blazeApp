type Props = {
	loading: boolean;
	error: string | null;
	/** 読み込み済みの件数 */
	count: number;
	/** 1件も無いときの文言 */
	emptyMessage: string;
	hasMore: boolean;
	onLoadMore: () => void;
	/** 一覧本体（ul など） */
	children: React.ReactNode;
};

/** 一覧の読み込み中・エラー・空・「もっと見る」の表示をまとめた枠 */
export function PagedListStatus({
	loading,
	error,
	count,
	emptyMessage,
	hasMore,
	onLoadMore,
	children,
}: Props) {
	return (
		<div className="flex w-full flex-col items-center gap-[30px] text-brand-white">
			{error && (
				<p role="alert" className="text-[14px] leading-[22px]">
					{error}
				</p>
			)}
			{!error && !loading && count === 0 && (
				<p className="text-[14px] leading-[22px]">{emptyMessage}</p>
			)}
			{count > 0 && children}
			{loading && <p className="text-[14px] leading-[22px]">読み込み中…</p>}
			{!loading && count > 0 && hasMore && (
				<button
					type="button"
					onClick={onLoadMore}
					className="text-[14px] leading-[22px] tracking-[1px] underline"
				>
					もっと見る
				</button>
			)}
		</div>
	);
}
