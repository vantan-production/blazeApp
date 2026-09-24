import Image from "next/image";

type Props = {
	/** 省略時は見出しを出さず、並び替えボタンだけを右寄せで表示する */
	title?: string;
	/** 現在の並び順。ボタンの読み上げに使う */
	order?: "asc" | "desc";
	onSort?: () => void;
};

const orderLabel = { asc: "古い順", desc: "新しい順" } as const;

/** 見出し＋並び替えボタン（Figma: 絞り込み検索 1445:922） */
export function SortableHeading({ title, order, onSort }: Props) {
	return (
		<div className="flex w-full items-center justify-between py-[10px] pr-[10px]">
			{title ? (
				<h2 className="text-[22px] text-brand-white">{title}</h2>
			) : (
				<span />
			)}
			<button
				type="button"
				onClick={onSort}
				aria-label={
					order ? `並び替え（現在: ${orderLabel[order]}）` : "並び替え"
				}
				className="flex size-9 cursor-pointer items-center justify-center rounded-[8px] bg-brand-white"
			>
				<Image
					src="/icons/sort.svg"
					alt=""
					width={30}
					height={30}
					className={order === "asc" ? "-scale-y-100" : ""}
				/>
			</button>
		</div>
	);
}
