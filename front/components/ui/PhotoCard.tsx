import Image from "next/image";
import Link from "next/link";

type Props = {
	title: string;
	href: string;
	/** タイトル上に添える英字ラベル */
	subtitle?: string;
	imageSrc?: string;
	/** 被写体が左寄りの写真を左右反転し、グラデーションの掛からない右側に見せる。文字入り画像では使わない */
	mirrorImage?: boolean;
	/** 画像の表示位置（CSS object-position）。縦長写真で顔などを見せたいときに指定する */
	imagePosition?: string;
};

/**
 * 右側に写真を敷いた横長のリンクカード。幅は親に合わせる。
 * 写真はカード右65%に置き、左の紺地からグラデーションでつなげてタイトルの白文字を読めるようにする。
 */
export function PhotoCard({
	title,
	href,
	subtitle,
	imageSrc = "/images/card-bg.png",
	mirrorImage = false,
	imagePosition,
}: Props) {
	return (
		<Link
			href={href}
			className="group relative flex h-[96px] w-full items-center justify-between gap-4 overflow-hidden rounded-[16px] border border-brand-white/30 bg-brand-blue px-5 text-brand-white"
		>
			<span aria-hidden className="absolute inset-y-0 right-0 w-[65%]">
				<Image
					src={imageSrc}
					alt=""
					fill
					sizes="(max-width: 430px) 65vw, 280px"
					className={`object-cover transition-transform duration-300 ${
						mirrorImage
							? "-scale-x-100 object-left group-hover:-scale-x-105 group-hover:scale-y-105"
							: "group-hover:scale-105"
					}`}
					style={imagePosition ? { objectPosition: imagePosition } : undefined}
				/>
			</span>
			<span
				aria-hidden
				className="absolute inset-0 bg-linear-to-r from-brand-blue from-35% via-brand-blue/50 via-50% to-transparent to-75%"
			/>
			<span className="relative flex min-w-0 flex-col gap-1">
				{subtitle && (
					<span className="font-savate text-[13px] leading-[16px] tracking-[2px] text-brand-yellow">
						{subtitle}
					</span>
				)}
				<span className="font-mincho text-[clamp(18px,5.5vw,22px)] leading-[26px] tracking-[1.5px]">
					{title}
				</span>
			</span>
			<span className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-brand-white bg-brand-blue/40 transition-colors group-hover:bg-brand-yellow/20">
				<Image src="/icons/arrow-right.svg" alt="" width={12} height={24} />
			</span>
		</Link>
	);
}
