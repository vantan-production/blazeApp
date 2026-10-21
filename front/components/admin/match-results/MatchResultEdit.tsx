"use client";

import { useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import type { MatchResult } from "@/lib/admin/matchResults";
import { ApiError, apiClient } from "@/lib/apiClient";
import { MatchResultForm } from "./MatchResultForm";

type Props = {
	id: string;
};

/** 試合結果の編集画面。今の内容（GET /api/match-results/:id）を読み込んでからフォームに入れる */
export function MatchResultEdit({ id }: Props) {
	const [result, setResult] = useState<MatchResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<MatchResult>>(`/api/match-results/${id}`)
			.then((res) => {
				if (!ignore) setResult(res.data);
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 404
						? "試合結果が見つかりません。削除された可能性があります。"
						: "試合結果の取得に失敗しました。",
				);
			});
		return () => {
			ignore = true;
		};
	}, [id]);

	if (error) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}
	if (!result) {
		return <p className="text-[14px] text-brand-white">読み込み中…</p>;
	}
	return <MatchResultForm result={result} />;
}
