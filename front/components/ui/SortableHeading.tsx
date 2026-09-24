import Image from "next/image";

type Props = {
	title: string;
	onSort?: () => void;
};

/** 見出し＋並び替えボタン（Figma: 絞り込み検索 1445:922） */
export function SortableHeading({ title, onSort }: Props) {
	return (
		<div className="flex w-full items-center justify-between py-[10px] pr-[10px]">
			<h2 className="text-[22px] text-brand-white">{title}</h2>
			<button
				type="button"
				onClick={onSort}
				aria-label="並び替え"
				className="flex size-9 cursor-pointer items-center justify-center rounded-[8px] bg-brand-white"
			>
				<Image src="/icons/sort.svg" alt="" width={30} height={30} />
			</button>
		</div>
	);
}
