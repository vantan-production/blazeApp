import Image from "next/image";
import Link from "next/link";
import { pageHref } from "@/lib/pagination";

type Props = {
	currentPage: number;
	totalPages: number;
	/** 一覧ページのパス（例: /news） */
	pathname: string;
	/** ページを移っても引き継ぐクエリ（並び順など）。?page= は自動で付ける */
	params?: Record<string, string | undefined>;
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

/**
 * ページ送り（Figma: pagenation 2134:1039）。
 * ページ番号をURL（?page=N）で持つリンクにして、JS無しでも動き、共有・戻るでも同じページが開けるようにする
 */
export function Pagination({
	currentPage,
	totalPages,
	pathname,
	params,
}: Props) {
	if (totalPages <= 1) return null;
	const items = getPageItems(currentPage, totalPages);
	const hrefFor = (page: number) => pageHref(pathname, page, params);

	return (
		<nav
			aria-label="ページ送り"
			className="flex w-full max-w-[354px] items-center justify-between py-[10px]"
		>
			<ArrowLink
				direction="prev"
				href={currentPage > 1 ? hrefFor(currentPage - 1) : undefined}
			/>
			<ul className="flex min-w-0 flex-1 items-center justify-around px-[clamp(4px,2.5vw,10px)]">
				{items.map((item, i) =>
					item === "ellipsis" ? (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: 省略記号は位置で識別する
							key={`ellipsis-${i}`}
							aria-hidden
							className="px-[clamp(4px,2.74vw,11px)] text-[14px] font-medium text-white"
						>
							・・・
						</li>
					) : (
						<li key={item}>
							<Link
								href={hrefFor(item)}
								aria-label={`${item}ページ目`}
								aria-current={item === currentPage ? "page" : undefined}
								className={`flex size-[clamp(32px,10vw,40px)] items-center justify-center rounded-[6px] text-[14px] font-medium text-black ${
									item === currentPage ? "bg-brand-yellow" : "bg-brand-white"
								}`}
							>
								{item}
							</Link>
						</li>
					),
				)}
			</ul>
			<ArrowLink
				direction="next"
				href={currentPage < totalPages ? hrefFor(currentPage + 1) : undefined}
			/>
		</nav>
	);
}

/** 前後のページへの矢印。先頭・末尾で移る先が無いときはリンクにせず薄く表示する */
function ArrowLink({
	direction,
	href,
}: {
	direction: "prev" | "next";
	href: string | undefined;
}) {
	const label = direction === "prev" ? "前のページ" : "次のページ";
	const icon = (
		<Image
			src={
				direction === "prev"
					? "/icons/chevron-left.svg"
					: "/icons/chevron-right.svg"
			}
			alt=""
			width={32}
			height={32}
		/>
	);
	if (!href) {
		return (
			<span aria-hidden className="shrink-0 opacity-40">
				{icon}
			</span>
		);
	}
	return (
		<Link href={href} aria-label={label} className="shrink-0">
			{icon}
		</Link>
	);
}
