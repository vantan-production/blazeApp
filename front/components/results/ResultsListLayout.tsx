import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { PageTitle } from "@/components/ui/PageTitle";
import { Pagination } from "@/components/ui/Pagination";
import type { PageInfo } from "@/lib/pagination";
import { routes } from "@/lib/routes";
import { EmptyNote } from "./EmptyNote";

type Props = {
	title: string;
	/** この一覧ページのパス。ページ送りのリンクに使う */
	pathname: string;
	pagination: PageInfo;
	/** 表示する項目が無いときに出す文言 */
	emptyMessage: string;
	isEmpty: boolean;
	children: React.ReactNode;
};

/** 実績・試合結果ページの「もっと見る」から開く一覧ページの共通枠（戻るリンク・見出し・ページ送り） */
export function ResultsListLayout({
	title,
	pathname,
	pagination,
	emptyMessage,
	isEmpty,
	children,
}: Props) {
	return (
		<PageShell>
			<main className="flex w-full flex-col items-center">
				<div className="w-full px-[clamp(16px,5.97vw,24px)] pt-4">
					<Link
						href={routes.results}
						className="-ml-2 flex items-center self-start py-1 pr-2 text-[14px] leading-[22px] tracking-[1px]"
					>
						<ChevronLeft aria-hidden size={24} strokeWidth={2} />
						実績・試合結果へ戻る
					</Link>
				</div>
				<PageTitle>{title}</PageTitle>
				<div className="flex w-full flex-col items-center gap-6 px-[clamp(16px,5.97vw,24px)] pt-6 pb-10">
					{isEmpty ? <EmptyNote>{emptyMessage}</EmptyNote> : children}
					<Pagination
						currentPage={pagination.page}
						totalPages={pagination.totalPages}
						pathname={pathname}
					/>
				</div>
			</main>
		</PageShell>
	);
}
