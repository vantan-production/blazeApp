"use client";

import { useCallback, useEffect, useState } from "react";
import { toErrorMessage } from "@/lib/admin/api";
import { memberApi } from "@/lib/members/api";

/**
 * 10件ずつのページネーションを持つ一覧APIを「もっと見る」で読み足すための共通処理。
 * setState は取得後のコールバックの中だけで行う（effect から同期的に呼ばない）。
 */
export function usePagedList<T>(endpoint: string, errorMessage: string) {
	const [items, setItems] = useState<T[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// nextPage を取り、1ページ目なら置き換え・2ページ目以降なら後ろに足す
	const fetchPage = useCallback(
		(nextPage: number, isCurrent: () => boolean = () => true) =>
			memberApi<T[]>(endpoint, { params: { page: nextPage } })
				.then((res) => {
					if (!isCurrent()) return;
					setItems((prev) =>
						nextPage === 1 ? res.data : [...prev, ...res.data],
					);
					setPage(nextPage);
					setTotalPages(res.pagination?.totalPages ?? 1);
					setError(null);
				})
				.catch((err: unknown) => {
					if (isCurrent()) setError(toErrorMessage(err, errorMessage));
				})
				.finally(() => {
					if (isCurrent()) setLoading(false);
				}),
		[endpoint, errorMessage],
	);

	useEffect(() => {
		let current = true;
		fetchPage(1, () => current);
		return () => {
			current = false;
		};
	}, [fetchPage]);

	/** 次の10件を読み足す（「もっと見る」） */
	const loadMore = () => {
		setLoading(true);
		fetchPage(page + 1);
	};

	/** 1ページ目から読み直す（新しく申請した後など） */
	const reload = () => {
		setLoading(true);
		fetchPage(1);
	};

	return {
		items,
		/** 画面上だけで行を書き換えたいとき（取り下げ依頼済みの印など） */
		setItems,
		loading,
		error,
		hasMore: page < totalPages,
		loadMore,
		reload,
	};
}
