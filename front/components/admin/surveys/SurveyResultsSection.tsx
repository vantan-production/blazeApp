"use client";

import { useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import {
	type SurveyOption,
	type SurveyResults,
	toPercent,
} from "@/lib/admin/surveys";
import { ApiError, apiClient } from "@/lib/apiClient";

type Props = {
	surveyId: string;
	/** 詳細で取得した選択肢（集計を取れなかったときもラベルだけは見せる） */
	options: SurveyOption[];
	allowMultiple: boolean;
};

/**
 * 設問の選択肢と集計結果（GET /api/surveys/:id/results）。
 * 選択肢ごとに件数と割合を横棒で出し、開くと選んだ人の名前が見られる。下に自由記述の一覧を置く。
 * 割合の分母は回答した人数（複数選択では合計が100%を超える）
 */
export function SurveyResultsSection({
	surveyId,
	options,
	allowMultiple,
}: Props) {
	const [results, setResults] = useState<SurveyResults | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<SurveyResults>>(`/api/surveys/${surveyId}/results`)
			.then((res) => {
				if (!ignore) setResults(res.data);
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 403
						? "集計結果は投稿担当・オーナーだけが見られます。"
						: "集計結果の取得に失敗しました。",
				);
			});
		return () => {
			ignore = true;
		};
	}, [surveyId]);

	return (
		<section
			aria-labelledby="survey-results"
			className="flex flex-col gap-4 rounded-[14px] bg-white/10 p-4"
		>
			<div className="flex items-baseline justify-between gap-2">
				<h3
					id="survey-results"
					className="text-[16px] leading-[22px] font-medium tracking-[1px]"
				>
					選択肢と集計結果
				</h3>
				{results && (
					<p className="text-[14px] leading-[22px] tracking-[1px]">
						回答 {results.respondent_count}人
					</p>
				)}
			</div>
			{allowMultiple && (
				<p className="text-[12px] leading-[18px] tracking-[1px] opacity-80">
					複数選べるアンケートのため、割合の合計は100%を超えることがあります。
				</p>
			)}
			{error && (
				<>
					<p className="text-[14px]">{error}</p>
					<ol className="flex list-decimal flex-col gap-1 pl-5 text-[14px] leading-[22px] tracking-[1px]">
						{options.map((option) => (
							<li key={option.id}>{option.label}</li>
						))}
					</ol>
				</>
			)}
			{!error && !results && <p className="text-[14px]">読み込み中…</p>}
			{results && (
				<>
					<ul className="flex flex-col gap-4">
						{results.options.map((option) => {
							const percent = toPercent(option.count, results.respondent_count);
							return (
								<li key={option.option_id} className="flex flex-col gap-1">
									<div className="flex items-baseline justify-between gap-2">
										<span className="min-w-0 text-[14px] leading-[22px] tracking-[1px] break-all">
											{option.label}
										</span>
										<span className="shrink-0 text-[14px] leading-[22px] tracking-[1px]">
											{option.count}人
											<span className="ml-1 text-[12px] opacity-80">
												（{percent}%）
											</span>
										</span>
									</div>
									{/* 件数と割合は上の文字で読めるので、横棒は見た目だけにする */}
									<div
										aria-hidden
										className="h-3 w-full overflow-hidden rounded-full bg-black/30"
									>
										<div
											className="h-full rounded-full bg-brand-yellow"
											style={{ width: `${percent}%` }}
										/>
									</div>
									{option.voters.length > 0 && (
										<details className="group">
											<summary className="cursor-pointer text-[12px] leading-[22px] tracking-[1px] underline opacity-80">
												選んだ人を見る
											</summary>
											<p className="pt-1 text-[13px] leading-[20px] tracking-[0.5px] break-all">
												{option.voters.map((voter) => voter.name).join("、")}
											</p>
										</details>
									)}
								</li>
							);
						})}
					</ul>
					{results.respondent_count === 0 && (
						<p className="text-[14px] opacity-80">まだ回答はありません。</p>
					)}
					{results.comments.length > 0 && (
						<div className="flex flex-col gap-2 border-t border-white/20 pt-3">
							<h4 className="text-[14px] leading-[22px] font-medium tracking-[1px]">
								コメント（{results.comments.length}件）
							</h4>
							<ul className="flex flex-col gap-2">
								{results.comments.map((comment) => (
									<li
										key={comment.user_id}
										className="flex flex-col rounded-[10px] bg-black/20 px-3 py-2"
									>
										<span className="text-[12px] leading-[18px] tracking-[1px] opacity-80">
											{comment.name}
										</span>
										<span className="text-[14px] leading-[22px] tracking-[1px] whitespace-pre-wrap break-all">
											{comment.comment}
										</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</>
			)}
		</section>
	);
}
