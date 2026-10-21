"use client";

import { useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import {
	type SurveyPending,
	surveyParticipantRoleLabel,
	toPercent,
} from "@/lib/admin/surveys";
import { ApiError, apiClient } from "@/lib/apiClient";

type Props = {
	surveyId: string;
};

/**
 * 未回答者（GET /api/surveys/:id/pending）。誰に声をかければよいか分かるよう、回答率と未回答者の名前を一覧する。
 * 対象は削除済みを除く全ユーザー（back の仕様）
 */
export function SurveyPendingSection({ surveyId }: Props) {
	const [data, setData] = useState<SurveyPending | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<SurveyPending>>(`/api/surveys/${surveyId}/pending`)
			.then((res) => {
				if (!ignore) setData(res.data);
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 403
						? "未回答者は投稿担当・オーナーだけが見られます。"
						: "未回答者の取得に失敗しました。",
				);
			});
		return () => {
			ignore = true;
		};
	}, [surveyId]);

	const rate = data ? toPercent(data.responded_count, data.total) : 0;

	return (
		<section
			aria-labelledby="survey-pending"
			className="flex flex-col gap-4 rounded-[14px] bg-white/10 p-4"
		>
			<h3
				id="survey-pending"
				className="text-[16px] leading-[22px] font-medium tracking-[1px]"
			>
				まだ回答していない人
			</h3>
			{error && <p className="text-[14px]">{error}</p>}
			{!error && !data && <p className="text-[14px]">読み込み中…</p>}
			{data && (
				<>
					<div className="flex flex-col gap-2">
						<div className="flex items-baseline justify-between gap-2">
							<p className="text-[14px] leading-[22px] tracking-[1px]">
								{data.total}人中 {data.responded_count}人が回答済み
							</p>
							<p className="text-[22px] leading-[22px] font-medium tracking-[1px]">
								{rate}%
							</p>
						</div>
						{/* 割合は上の文字で読めるので、横棒は見た目だけにする */}
						<div
							aria-hidden
							className="h-3 w-full overflow-hidden rounded-full bg-black/30"
						>
							<div
								className="h-full rounded-full bg-[#d1f0ae]"
								style={{ width: `${rate}%` }}
							/>
						</div>
					</div>
					{data.pending.length === 0 ? (
						<p className="text-[14px] opacity-80">全員が回答しました。</p>
					) : (
						<ul className="flex flex-col">
							{data.pending.map((person) => (
								<li
									key={person.id}
									className="flex items-center gap-2 border-b border-white/20 py-2 last:border-b-0"
								>
									<span className="min-w-0 truncate text-[14px] leading-[22px] tracking-[1px]">
										{person.name}
									</span>
									<span className="shrink-0 rounded-[200px] bg-white/15 px-2 text-[11px] leading-[18px] tracking-[1px]">
										{surveyParticipantRoleLabel[person.role] ?? person.role}
									</span>
								</li>
							))}
						</ul>
					)}
				</>
			)}
		</section>
	);
}
