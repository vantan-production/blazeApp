import Link from "next/link";

type Props = {
	href: string;
	children: React.ReactNode;
};

/** 見出しボックスの下に置く「〜へ戻る」リンク（共通の枠に「戻る」が無いため、資料庫の画面内に置く） */
export function DocumentsBackLink({ href, children }: Props) {
	return (
		<Link
			href={href}
			className="-mt-12 inline-flex items-center gap-1 self-start py-2 pr-2 text-[14px] leading-[22px] tracking-[1px] text-brand-white transition-opacity hover:opacity-80"
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth={2.5}
				strokeLinecap="round"
				strokeLinejoin="round"
				className="size-4"
			>
				<path d="M15 18l-6-6 6-6" />
			</svg>
			{children}
		</Link>
	);
}
