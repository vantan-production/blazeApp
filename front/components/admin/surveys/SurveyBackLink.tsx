import Link from "next/link";

type Props = {
	href: string;
	/** 例: 一覧に戻る */
	label: string;
};

/** 見出しボックスのすぐ下に置く「戻る」リンク（アンケートの作成・詳細・編集画面で使う） */
export function SurveyBackLink({ href, label }: Props) {
	return (
		<Link
			href={href}
			className="-mt-14 inline-flex items-center gap-1 self-start py-2 pr-2 text-[14px] leading-[14px] font-medium tracking-[1px] text-brand-white transition-opacity hover:opacity-80"
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
			{label}
		</Link>
	);
}
