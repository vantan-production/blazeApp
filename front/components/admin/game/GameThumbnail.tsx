type Props = {
	/** 画像のURL。null なら「NO IMAGE」の枠を出す */
	url: string | null;
	/** 大きさ・角丸など（呼び出し側で決める） */
	className?: string;
};

/** 試合風景の画像。画像が無い投稿でも一覧の並びが崩れないよう同じ大きさの枠を出す */
export function GameThumbnail({ url, className = "" }: Props) {
	if (!url) {
		return (
			<div
				className={`flex items-center justify-center bg-white/20 text-[10px] tracking-[1px] text-brand-white/70 ${className}`}
			>
				NO IMAGE
			</div>
		);
	}
	return (
		// biome-ignore lint/performance/noImgElement: S3の署名付きURLは毎回変わり、ホストもnext.configに登録していないためnext/imageを使わない
		<img src={url} alt="" className={`bg-white/20 object-cover ${className}`} />
	);
}
