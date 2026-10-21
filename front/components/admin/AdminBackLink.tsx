import Link from "next/link";

type Props = {
	href: string;
};

/** ページ枠の左上（見出しボックスの上）に置く「戻る」リンク。親要素に relative が必要 */
export function AdminBackLink({ href }: Props) {
	return (
		<Link
			href={href}
			className="absolute top-6 left-[27px] inline-flex items-center gap-1 py-2 pr-2 text-[16px] leading-[16px] font-medium tracking-[1px] text-white transition-opacity hover:opacity-80"
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth={2.5}
				strokeLinecap="round"
				strokeLinejoin="round"
				className="size-5"
			>
				<path d="M15 18l-6-6 6-6" />
			</svg>
			戻る
		</Link>
	);
}
