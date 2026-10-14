"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import type { MatchResult } from "@/lib/admin/matchResults";
import { apiClient } from "@/lib/apiClient";
import { MatchResultListItem } from "./MatchResultListItem";

/** 試合結果の一覧（GET /api/match-results。試合日の新しい順に10件ずつ追加読み込み） */
export function MatchResultList() {
	const [results, setResults] = useState<MatchResult[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// nextPage を取り、1ページ目なら置き換え・2ページ目以降なら後ろに足す。
	// setState は取得後のコールバックの中だけで行う（effect から同期的に呼ばない）
	const fetchPage = useCallback(
		(nextPage: number, isCurrent: () => boolean = () => true) =>
			apiClient<ApiSuccess<MatchResult[]>>("/api/match-results", {
				params: { page: nextPage },
			})
				.then((res) => {
					if (!isCurrent()) return;
					setResults((prev) =>
						nextPage === 1 ? res.data : [...prev, ...res.data],
					);
					setPage(nextPage);
					setTotalPages(res.pagination?.totalPages ?? 1);
					setError(null);
				})
				.catch(() => {
					if (!isCurrent()) return;
					setError("試合結果の取得に失敗しました。");
				})
				.finally(() => {
					if (isCurrent()) setLoading(false);
				}),
		[],
	);

	useEffect(() => {
		let current = true;
		fetchPage(1, () => current);
		return () => {
			current = false;
		};
	}, [fetchPage]);

	const loadMore = () => {
		setLoading(true);
		fetchPage(page + 1);
	};

	if (error) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}

	if (!loading && results.length === 0) {
		return (
			<p className="text-[14px] text-brand-white">
				まだ試合結果はありません。右下の＋から登録できます。
			</p>
		);
	}

	return (
		<div className="flex w-full flex-col items-center gap-[30px]">
			<p className="w-full rounded-[10px] bg-white/10 px-3 py-2 text-[12px] leading-[18px] tracking-[1px] text-brand-white">
				一番上（試合日が最も新しいもの）が、公開ページの「前回の試合結果」に表示されます。
			</p>
			<ul className="flex w-full flex-col gap-[30px]">
				{results.map((result) => (
					<MatchResultListItem key={result.id} result={result} />
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
