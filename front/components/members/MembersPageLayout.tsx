import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import { memberRoutes } from "@/lib/members/routes";

type Props = {
	/** 上部の白い見出しボックスの文言 */
	title: string;
	/** 左上の「戻る」の行き先（既定: 関係者ページTOP） */
	backHref?: string;
	children: React.ReactNode;
};

/** 見出しボックス＋本文の関係者ページ枠。管理画面の AdminPageLayout と同じ見た目に、左上の「戻る」を足したもの */
export function MembersPageLayout({
	title,
	backHref = memberRoutes.top,
	children,
}: Props) {
	return (
		<main className="relative flex w-full flex-1 flex-col items-center gap-[40px] px-[27px] pt-[82px] pb-12">
			<MembersBackLink href={backHref} />
			<AdminPageTitle>{title}</AdminPageTitle>
			{children}
		</main>
	);
}

/** ページ枠の左上（見出しボックスの上）に置く「戻る」リンク。親要素に relative が必要 */
export function MembersBackLink({ href }: { href: string }) {
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
