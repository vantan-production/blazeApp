"use client";

import Image from "next/image";
import { useState } from "react";

export type GalleryPhoto = {
	src: string;
	alt: string;
};

type Props = {
	photos: GalleryPhoto[];
	/** カルーセルの読み上げ用の名前 */
	label?: string;
};

/** 白枠4px・角丸12pxの写真枠。サイズは className で親から指定する */
function PhotoFrame({
	photo,
	className,
	imageClassName = "",
	children,
}: {
	photo: GalleryPhoto;
	className: string;
	/** 枠の中で写真をずらすときに指定する（左右から覗かせる写真で、見えている部分に写真の中央を出すため） */
	imageClassName?: string;
	/** 写真の上に重ねる要素 */
	children?: React.ReactNode;
}) {
	return (
		<div
			className={`overflow-hidden rounded-[12px] border-4 border-brand-white ${className}`}
		>
			<div className="relative size-full">
				<div className={`absolute inset-0 ${imageClassName}`}>
					<Image
						src={photo.src}
						alt={photo.alt}
						fill
						sizes="70vw"
						className="object-cover"
					/>
				</div>
				{children}
			</div>
		</div>
	);
}

/** この枚数以上はドットを並べず「3 / 8」の数字で表す */
const COUNTER_THRESHOLD = 5;

/** 何枚目かを写真の下側に重ねて表示する。枚数が多いときはドットの代わりに数字で表す */
function PhotoIndicator({ index, count }: { index: number; count: number }) {
	return (
		<span
			aria-hidden
			className="absolute bottom-3 left-1/2 flex h-5 -translate-x-1/2 items-center gap-[6px] rounded-full bg-black/45 px-2 text-[12px] leading-none tracking-[1px] text-brand-white"
		>
			{count >= COUNTER_THRESHOLD
				? `${index + 1} / ${count}`
				: Array.from({ length: count }, (_, i) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: 並び替えのない固定の点
							key={i}
							className={`size-[6px] rounded-full ${
								i === index ? "bg-brand-white" : "bg-brand-white/40"
							}`}
						/>
					))}
		</span>
	);
}

/**
 * 活動写真のカルーセル（Figma: gallery 1250:344）。
 * 中央の写真を大きく、前後の写真を画面の左右端から覗かせる。端の写真を押すとその写真が中央に来る。
 * 最初と最後はつなげない（1枚目では左、最後の写真では右に何も出さない）。
 * 覗かせる写真は見えている幅が狭く、そのままだと写真の端（余白など）しか見えないため、
 * 写真の中央が見えている部分に来るようにずらして表示する。
 * 寸法はFigmaの402px幅を基準に cqw（このギャラリー幅に対する%）へ換算している。
 * 画面端まで写真を出すため、親の左右余白（px-6）を打ち消して全幅に広げる。
 * はみ出た写真は overflow-clip で切る（overflow-hidden だと端のボタンにフォーカスした時に中身がスクロールしてずれる）。
 */
export function ActivityGallery({ photos, label = "活動写真" }: Props) {
	const [index, setIndex] = useState(0);
	const count = photos.length;
	if (count === 0) return null;

	const hasPrev = index > 0;
	const hasNext = index < count - 1;
	const move = (diff: number) =>
		setIndex((prev) => Math.min(Math.max(prev + diff, 0), count - 1));

	return (
		<div className="@container -mx-6 w-[calc(100%+48px)] self-stretch overflow-clip">
			<section
				aria-roledescription="カルーセル"
				aria-label={label}
				className="relative flex h-[72.39cqw] items-center justify-center"
			>
				{/* 枠（幅59.7cqw）のうち画面に見えるのは内側の 59.7 - 51.24 = 8.46cqw だけ。
				    写真の中央をその中央に合わせるため、写真を 59.7/2 - 8.46/2 = 25.62cqw 内側へずらす */}
				{hasPrev && (
					<button
						type="button"
						onClick={() => move(-1)}
						aria-label="前の写真"
						className="absolute top-1/2 left-[-51.24cqw] -translate-y-1/2 cursor-pointer"
					>
						<PhotoFrame
							photo={photos[index - 1]}
							className="h-[39.8cqw] w-[59.7cqw]"
							imageClassName="translate-x-[25.62cqw]"
						/>
					</button>
				)}
				<PhotoFrame photo={photos[index]} className="h-[46.27cqw] w-[69.65cqw]">
					{count > 1 && <PhotoIndicator index={index} count={count} />}
				</PhotoFrame>
				{hasNext && (
					<button
						type="button"
						onClick={() => move(1)}
						aria-label="次の写真"
						className="absolute top-1/2 right-[-51.24cqw] -translate-y-1/2 cursor-pointer"
					>
						<PhotoFrame
							photo={photos[index + 1]}
							className="h-[39.8cqw] w-[59.7cqw]"
							imageClassName="-translate-x-[25.62cqw]"
						/>
					</button>
				)}
			</section>
			<p aria-live="polite" className="sr-only">
				{`${index + 1}枚目 / 全${count}枚`}
			</p>
		</div>
	);
}
