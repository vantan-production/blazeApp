"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { type ApiSuccess, toErrorMessage } from "@/lib/admin/api";
import { apiClient } from "@/lib/apiClient";
import { pageHref } from "@/lib/pagination";
import { InquiryListFilters } from "./InquiryListFilters";
import { InquiryListItem } from "./InquiryListItem";
import type { Inquiry, InquiryCounts, InquiryTab } from "./types";

/** GET /api/inquiry のレスポンス（一覧に加えてタブ用の件数が返る） */
type InquiryListResponse = ApiSuccess<Inquiry[]> & { counts: InquiryCounts };

type Props = {
	/** 表示中のタブ（URL の ?status=） */
	tab: InquiryTab;
	/** 検索語（URL の ?q=） */
	keyword: string;
};

/**
 * 問い合わせ一覧（GET /api/inquiry。新しい順に10件ずつ追加読み込み）。
 * タブと検索語は URL で持ち、変えたら1ページ目から取り直す
 */
export function InquiryList({ tab, keyword }: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const [inquiries, setInquiries] = useState<Inquiry[]>([]);
	const [counts, setCounts] = useState<InquiryCounts | null>(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// 表示中の条件で nextPage を取り、1ページ目なら置き換え・2ページ目以降なら後ろに足す。
	// setState は取得後だけで行う（effect から同期的に呼ばない: react-hooks/set-state-in-effect）
	const fetchPage = useCallback(
		(nextPage: number, isCurrent: () => boolean = () => true) =>
			apiClient<InquiryListResponse>("/api/inquiry", {
				params: {
					page: nextPage,
					...(tab !== "all" && { status: tab }),
					...(keyword && { q: keyword }),
				},
			})
				.then((res) => {
					if (!isCurrent()) return;
					setInquiries((prev) =>
						nextPage === 1 ? res.data : [...prev, ...res.data],
					);
					setCounts(res.counts);
					setPage(nextPage);
					setTotalPages(res.pagination?.totalPages ?? 1);
					setError(null);
				})
				.catch((err) => {
					if (isCurrent()) {
						setError(toErrorMessage(err, "問い合わせの取得に失敗しました。"));
					}
				})
				.finally(() => {
					if (isCurrent()) setLoading(false);
				}),
		[tab, keyword],
	);

	useEffect(() => {
		let current = true;
		fetchPage(1, () => current);
		return () => {
			current = false;
		};
	}, [fetchPage]);

	/** タブ・検索語を URL に反映する（履歴を増やさないよう replace。1ページ目から取り直す） */
	const changeFilter = (nextTab: InquiryTab, nextKeyword: string) => {
		if (nextTab === tab && nextKeyword === keyword) return;
		setInquiries([]);
		setLoading(true);
		router.replace(
			pageHref(pathname, 1, {
				status: nextTab === "all" ? undefined : nextTab,
				q: nextKeyword || undefined,
			}),
			{ scroll: false },
		);
	};

	const loadMore = () => {
		setLoading(true);
		fetchPage(page + 1);
	};

	const filtered = tab !== "all" || keyword !== "";

	return (
		<div className="flex w-full flex-col items-center gap-6">
			<InquiryListFilters
				tab={tab}
				keyword={keyword}
				counts={counts}
				onTabChange={(next) => changeFilter(next, keyword)}
				onSearch={(next) => changeFilter(tab, next)}
			/>
			{error && <p className="text-[14px] text-brand-white">{error}</p>}
			{!error && !loading && inquiries.length === 0 && (
				<p className="text-[14px] text-brand-white">
					{filtered
						? "条件に合う問い合わせはありません。"
						: "問い合わせはまだありません。"}
				</p>
			)}
			<ul className="flex w-full flex-col gap-3">
				{inquiries.map((inquiry) => (
					<InquiryListItem key={inquiry.id} inquiry={inquiry} />
				))}
			</ul>
			{loading && <p className="text-[14px] text-brand-white">読み込み中…</p>}
			{!loading && page < totalPages && (
				<button
					type="button"
					onClick={loadMore}
					className="text-[14px] leading-[22px] tracking-[1px] text-brand-white underline"
				>
					もっと見る
				</button>
			)}
		</div>
	);
}
