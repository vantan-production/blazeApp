import Image from "next/image";
import Link from "next/link";

type Props = {
	imageSrc: string;
	title: string;
	/** 左上の番号バッジ（01, 02…）に出す通し番号 */
	number: number;
	/** 指定するとタイトルの下に登録日を出す（実績一覧ページ用） */
	date?: string;
	dateTime?: string;
	/** 指定するとカード全体を詳細ページへのリンクにする */
	href?: string;
};

/**
 * 写真と大会名を並べた白い実績カード。実績スライダーと実績一覧ページで共通。
 * href を渡すとカード全体が詳細ページ（他の写真も見られる）へのリンクになる
 */
export function AchievementCard({
	imageSrc,
	title,
	number,
	date,
	dateTime,
	href,
}: Props) {
	const className =
		"flex w-full items-stretch gap-3 rounded-[20px] bg-brand-white p-3 text-brand-blue";
	const content = (
		<>
			<div className="relative aspect-[3/4] w-[45%] shrink-0 overflow-hidden rounded-[12px] bg-brand-black">
				<Image
					src={imageSrc}
					alt=""
					fill
					sizes="180px"
					className="object-cover"
				/>
			</div>
			<div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
				<span className="self-start rounded-full bg-brand-red px-3 py-1 font-savate text-[12px] leading-none tracking-[2px] text-brand-white">
					{String(number).padStart(2, "0")}
				</span>
				<p className="text-[clamp(13px,4vw,16px)] leading-[1.5] font-bold whitespace-pre-line">
					{title}
				</p>
				{date && (
					<time
						dateTime={dateTime}
						className="font-inter text-[13px] font-bold tracking-[1px] text-brand-red"
					>
						{date}
					</time>
				)}
			</div>
		</>
	);

	if (!href) return <div className={className}>{content}</div>;
	return (
		<Link
			href={href}
			className={`${className} transition-opacity hover:opacity-90`}
		>
			{content}
		</Link>
	);
}
