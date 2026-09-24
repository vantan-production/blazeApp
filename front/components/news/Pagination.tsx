import Image from "next/image";

type Props = {
	currentPage: number;
	totalPages: number;
	onChange: (page: number) => void;
};

type PageItem = number | "ellipsis";

/**
 * 表示するページ番号を決める。
 * ページ数が少なければ全て、多ければ「現在ページ・・・最後の2ページ」（Figmaの形）にする
 */
function getPageItems(current: number, total: number): PageItem[] {
	if (total <= 4) {
		return Array.from({ length: total }, (_, i) => i + 1);
	}
	if (current >= total - 2) {
		return [1, "ellipsis", total - 2, total - 1, total];
	}
	return [current, "ellipsis", total - 1, total];
}

/** ページ送り（Figma: pagenation 2134:1039） */
export function Pagination({ currentPage, totalPages, onChange }: Props) {
	if (totalPages <= 1) return null;
	const items = getPageItems(currentPage, totalPages);

	return (
		<nav
			aria-label="ページ送り"
			className="flex w-full max-w-[354px] items-center justify-between py-[10px]"
		>
			<button
				type="button"
				aria-label="前のページ"
				disabled={currentPage === 1}
				onClick={() => onChange(currentPage - 1)}
				className="shrink-0 cursor-pointer disabled:cursor-default disabled:opacity-40"
			>
				<Image src="/icons/chevron-left.svg" alt="" width={32} height={32} />
			</button>
			<ul className="flex flex-1 items-center justify-between px-[10px]">
				{items.map((item, i) =>
					item === "ellipsis" ? (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: 省略記号は位置で識別する
							key={`ellipsis-${i}`}
							aria-hidden
							className="px-[11px] text-[14px] font-medium text-white"
						>
							・・・
						</li>
					) : (
						<li key={item}>
							<button
								type="button"
								aria-label={`${item}ページ目`}
								aria-current={item === currentPage ? "page" : undefined}
								onClick={() => onChange(item)}
								className={`flex size-10 cursor-pointer items-center justify-center rounded-[6px] text-[14px] font-medium text-black ${
									item === currentPage ? "bg-brand-yellow" : "bg-brand-white"
								}`}
							>
								{item}
							</button>
						</li>
					),
				)}
			</ul>
			<button
				type="button"
				aria-label="次のページ"
				disabled={currentPage === totalPages}
				onClick={() => onChange(currentPage + 1)}
				className="shrink-0 cursor-pointer disabled:cursor-default disabled:opacity-40"
			>
				<Image src="/icons/chevron-right.svg" alt="" width={32} height={32} />
			</button>
		</nav>
	);
}
