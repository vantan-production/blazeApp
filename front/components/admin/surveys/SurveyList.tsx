"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import type { SurveySummary } from "@/lib/admin/surveys";
import { ApiError, apiClient } from "@/lib/apiClient";
import { SurveyListItem } from "./SurveyListItem";

/** アンケート・出欠確認の一覧（GET /api/surveys。新しい順に10件ずつ追加読み込み） */
export function SurveyList() {
	const [surveys, setSurveys] = useState<SurveySummary[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// nextPage を取り、1ページ目なら置き換え・2ページ目以降なら後ろに足す。
	// setState は取得後のコールバックの中だけで行う（effect から同期的に呼ばない）
	const fetchPage = useCallback(
		(nextPage: number, isCurrent: () => boolean = () => true) =>
			apiClient<ApiSuccess<SurveySummary[]>>("/api/surveys", {
				params: { page: nextPage },
			})
				.then((res) => {
					if (!isCurrent()) return;
					setSurveys((prev) =>
						nextPage === 1 ? res.data : [...prev, ...res.data],
					);
					setPage(nextPage);
					setTotalPages(res.pagination?.totalPages ?? 1);
					setError(null);
				})
				.catch((err) => {
					if (!isCurrent()) return;
					setError(
						err instanceof ApiError && err.status === 403
							? "アンケートを見る権限がありません。"
							: "アンケートの取得に失敗しました。",
					);
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

	if (!loading && surveys.length === 0) {
		return (
			<p className="text-[14px] text-brand-white">
				まだアンケートはありません。右下の＋から作成できます。
			</p>
		);
	}

	return (
		<div className="flex w-full flex-col items-center gap-[30px]">
			<ul className="flex w-full flex-col gap-[30px]">
				{surveys.map((survey) => (
					<SurveyListItem key={survey.id} survey={survey} />
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
