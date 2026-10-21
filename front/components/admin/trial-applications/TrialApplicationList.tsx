"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import type { TrialApplication } from "@/lib/admin/trialApplications";
import { apiClient } from "@/lib/apiClient";
import { TrialApplicationListItem } from "./TrialApplicationListItem";

/**
 * 体験申し込み一覧（GET /api/trial-application）。
 * back が申し込みの新しい順に10件ずつ返すので、「もっと見る」で後ろに足していく（絞り込み・並び替えは API に無い）
 */
export function TrialApplicationList() {
	const [applications, setApplications] = useState<TrialApplication[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// nextPage を取り、1ページ目なら置き換え・2ページ目以降なら後ろに足す。
	// setState は取得後のコールバックの中だけで行う（effect から同期的に呼ばない）
	const fetchPage = useCallback(
		(nextPage: number, isCurrent: () => boolean = () => true) =>
			apiClient<ApiSuccess<TrialApplication[]>>("/api/trial-application", {
				params: { page: nextPage },
			})
				.then((res) => {
					if (!isCurrent()) return;
					setApplications((prev) =>
						nextPage === 1 ? res.data : [...prev, ...res.data],
					);
					setPage(nextPage);
					setTotalPages(res.pagination?.totalPages ?? 1);
					setError(null);
				})
				.catch(() => {
					if (isCurrent()) setError("体験申し込みの取得に失敗しました。");
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

	if (error && applications.length === 0) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}

	if (!loading && applications.length === 0) {
		return (
			<p className="text-[14px] text-brand-white">
				体験の申し込みはまだありません。
			</p>
		);
	}

	return (
		<div className="flex w-full flex-col items-center gap-6">
			<p className="w-full text-[12px] leading-[18px] tracking-[1px] text-brand-white">
				申し込みの新しい順に表示しています。
			</p>
			<ul className="flex w-full flex-col gap-3">
				{applications.map((application) => (
					<TrialApplicationListItem
						key={application.id}
						application={application}
					/>
				))}
			</ul>
			{error && <p className="text-[14px] text-brand-white">{error}</p>}
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
