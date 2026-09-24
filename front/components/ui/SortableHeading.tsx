import Image from "next/image";
import Link from "next/link";

type Props = {
	/** 省略時は見出しを出さず、並び替えボタンだけを右寄せで表示する */
	title?: string;
	/** 見出しのレベル。ページタイトルとして使うときは h1 にする */
	titleAs?: "h1" | "h2";
	/** 見出しの位置。center はボタンと同じ幅を左に空けて、画面の中央に置く */
	align?: "left" | "center";
	/** 現在の並び順。ボタンの読み上げに使う */
	order?: "asc" | "desc";
	onSort?: () => void;
	/** 指定するとボタンの代わりにリンクにする。並び順をURLで持つ一覧ページ用 */
	sortHref?: string;
};

const orderLabel = { asc: "古い順", desc: "新しい順" } as const;

/** 見出し＋並び替えボタン（Figma: 絞り込み検索 1445:922） */
export function SortableHeading({
	title,
	titleAs: Heading = "h2",
	align = "left",
	order,
	onSort,
	sortHref,
}: Props) {
	const centered = align === "center";
	const sortLabel = order
		? `並び替え（現在: ${orderLabel[order]}）`
		: "並び替え";
	const sortClassName =
		"flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[8px] bg-brand-white";
	const sortIcon = (
		<Image
			src="/icons/sort.svg"
			alt=""
			width={30}
			height={30}
			className={order === "asc" ? "-scale-y-100" : ""}
		/>
	);
	return (
		<div
			className={`flex w-full items-center justify-between gap-2 py-[10px] ${
				centered ? "px-[10px]" : "pr-[10px]"
			}`}
		>
			{/* 中央寄せでは見出しの左右の幅を揃えるため、ボタンと同じ大きさの空きを置く */}
			{centered && <span aria-hidden className="size-9 shrink-0" />}
			{title ? (
				<Heading
					className={`min-w-0 text-[22px] leading-[22px] tracking-[1.5px] text-brand-white ${
						centered ? "flex-1 text-center" : ""
					}`}
				>
					{title}
				</Heading>
			) : (
				<span />
			)}
			{sortHref ? (
				<Link href={sortHref} aria-label={sortLabel} className={sortClassName}>
					{sortIcon}
				</Link>
			) : (
				<button
					type="button"
					onClick={onSort}
					aria-label={sortLabel}
					className={sortClassName}
				>
					{sortIcon}
				</button>
			)}
		</div>
	);
}
