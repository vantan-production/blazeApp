"use client";

import { useCallback, useEffect, useState } from "react";
import { type ApiSuccess, toErrorMessage } from "@/lib/admin/api";
import { apiClient } from "@/lib/apiClient";
import { TrialNoticeListItem } from "./TrialNoticeListItem";
import type { TrialNoticeListItem as Item } from "./types";

/** 体験申込者への連絡メールの送信履歴（GET /api/trial-notices。新しい順に追加読み込み） */
export function TrialNoticeList() {
	const [notices, setNotices] = useState<Item[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// setState は取得後だけで行う（effect から同期的に呼ばない: react-hooks/set-state-in-effect）
	const fetchPage = useCallback(
		(nextPage: number) =>
			apiClient<ApiSuccess<Item[]>>("/api/trial-notices", {
				params: { page: nextPage },
			})
				.then((res) => {
					setNotices((prev) =>
						nextPage === 1 ? res.data : [...prev, ...res.data],
					);
					setPage(nextPage);
					setTotalPages(res.pagination?.totalPages ?? 1);
					setError(null);
				})
				.catch((err) => {
					setError(toErrorMessage(err, "送信履歴の取得に失敗しました。"));
				})
				.finally(() => setLoading(false)),
		[],
	);

	useEffect(() => {
		fetchPage(1);
	}, [fetchPage]);

	const loadMore = () => {
		setLoading(true);
		fetchPage(page + 1);
	};

	if (error) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}

	if (!loading && notices.length === 0) {
		return (
			<p className="text-[14px] text-brand-white">送信履歴はまだありません。</p>
		);
	}

	return (
		<div className="flex w-full flex-col items-center gap-6">
			<ul className="flex w-full flex-col gap-3">
				{notices.map((notice) => (
					<TrialNoticeListItem key={notice.id} notice={notice} />
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
