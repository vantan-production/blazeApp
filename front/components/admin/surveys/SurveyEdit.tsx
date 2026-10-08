"use client";

import { useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import type { SurveyDetail, SurveyResults } from "@/lib/admin/surveys";
import { ApiError, apiClient } from "@/lib/apiClient";
import { SurveyForm } from "./SurveyForm";

type Props = {
	id: string;
};

type Loaded = {
	survey: SurveyDetail;
	respondentCount: number;
};

/**
 * アンケートの編集画面。今の内容（GET /api/surveys/:id）と回答済みの人数（GET /api/surveys/:id/results）を
 * 読み込んでからフォームに入れる。人数は「選択肢を変えると回答が消える」警告に使う
 */
export function SurveyEdit({ id }: Props) {
	const [loaded, setLoaded] = useState<Loaded | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;
		Promise.all([
			apiClient<ApiSuccess<SurveyDetail>>(`/api/surveys/${id}`),
			apiClient<ApiSuccess<SurveyResults>>(`/api/surveys/${id}/results`),
		])
			.then(([detail, results]) => {
				if (ignore) return;
				setLoaded({
					survey: detail.data,
					respondentCount: results.data.respondent_count,
				});
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 404
						? "アンケートが見つかりません。削除された可能性があります。"
						: "アンケートの取得に失敗しました。",
				);
			});
		return () => {
			ignore = true;
		};
	}, [id]);

	if (error) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}

	if (!loaded) {
		return <p className="text-[14px] text-brand-white">読み込み中…</p>;
	}

	return (
		<SurveyForm
			survey={loaded.survey}
			respondentCount={loaded.respondentCount}
		/>
	);
}
