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

	const load = useCallback(async (nextPage: number) => {
		setLoading(true);
		setError(null);
		try {
			const res = await apiClient<ApiSuccess<Item[]>>("/api/trial-notices", {
				params: { page: nextPage },
				// 当面はログインなしでも管理画面を表示するため、401 でも公開サイトの /login へ飛ばさない
				skipAuthRedirect: true,
			});
			setNotices((prev) =>
				nextPage === 1 ? res.data : [...prev, ...res.data],
			);
			setPage(nextPage);
			setTotalPages(res.pagination?.totalPages ?? 1);
		} catch (err) {
			setError(toErrorMessage(err, "送信履歴の取得に失敗しました。"));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load(1);
	}, [load]);

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
					onClick={() => load(page + 1)}
					className="text-[14px] leading-[22px] tracking-[1px] text-brand-white underline"
				>
					もっと見る
				</button>
			)}
		</div>
	);
}
