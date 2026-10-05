"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { AdminButtonLink } from "@/components/admin/AdminButton";
import { type ApiSuccess, toErrorMessage } from "@/lib/admin/api";
import { adminSurveyEditPath, adminSurveyRoutes } from "@/lib/admin/routes";
import {
	formatSurveyDate,
	formatSurveyDateTime,
	type SurveyDetail,
} from "@/lib/admin/surveys";
import { ApiError, apiClient } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";
import { SurveyPendingSection } from "./SurveyPendingSection";
import { SurveyResultsSection } from "./SurveyResultsSection";
import { SurveyTags } from "./SurveyTags";

type Props = {
	id: string;
};

/**
 * アンケート・出欠確認の詳細（GET /api/surveys/:id）。
 * 説明の下に選択肢ごとの集計結果（/results）と未回答者（/pending）を出し、編集画面へのリンクと削除（DELETE）を置く
 */
export function SurveyDetailView({ id }: Props) {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const [survey, setSurvey] = useState<SurveyDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<SurveyDetail>>(`/api/surveys/${id}`)
			.then((res) => {
				if (!ignore) setSurvey(res.data);
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

	const deleteSurvey = async () => {
		setDeleting(true);
		try {
			await apiClient(`/api/surveys/${id}`, { method: "DELETE" });
			showToast("アンケートを削除しました。");
			router.push(adminSurveyRoutes.list);
		} catch (err) {
			showToast(toErrorMessage(err, "削除に失敗しました。"), "error");
			setDeleting(false);
			setDeleteOpen(false);
		}
	};

	const closeDelete = useCallback(() => setDeleteOpen(false), []);

	if (error) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}

	if (!survey) {
		return <p className="text-[14px] text-brand-white">読み込み中…</p>;
	}

	const edited = survey.updated_at !== survey.created_at;

	return (
		<article className="flex w-full flex-col gap-6 text-brand-white">
			<div className="flex flex-col gap-2 after:h-px after:w-full after:bg-white">
				<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
					{formatSurveyDate(survey.created_at)} 作成
				</time>
				<h2 className="text-[20px] leading-[28px] font-medium tracking-[1px] break-all">
					{survey.title}
				</h2>
				<SurveyTags survey={survey} />
				<p className="pb-2 text-[12px] leading-[18px] tracking-[1px] opacity-80">
					作成: {survey.admin_name}
					{edited && `（${formatSurveyDateTime(survey.updated_at)} に更新）`}
				</p>
			</div>
			{survey.body && (
				<p className="text-[14px] leading-[24px] tracking-[1px] whitespace-pre-wrap break-all">
					{survey.body}
				</p>
			)}
			<AdminButtonLink
				href={adminSurveyEditPath(survey.id)}
				variant="light"
				size="sm"
			>
				編集する
			</AdminButtonLink>
			<SurveyResultsSection
				surveyId={survey.id}
				options={survey.options}
				allowMultiple={survey.allow_multiple}
			/>
			<SurveyPendingSection surveyId={survey.id} />
			<div className="mt-6 flex flex-col items-center gap-2 border-t border-white/30 pt-6">
				<button
					type="button"
					onClick={() => setDeleteOpen(true)}
					className="flex h-10 items-center gap-2 rounded-[10px] px-4 text-[15px] leading-[22px] tracking-[1px] text-[#ff8a8d] ring-1 ring-[#ff8a8d]/70 transition-opacity hover:opacity-80"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
						className="size-[18px]"
					>
						<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
					</svg>
					このアンケートを削除
				</button>
			</div>
			<AdminActionDialog
				open={deleteOpen}
				tone="danger"
				title="このアンケートを削除しますか？"
				description="選択肢とこれまでの回答もすべて削除され、関係者ページからも見えなくなります。この操作は取り消せません。"
				confirmLabel="削除する"
				onConfirm={deleteSurvey}
				onCancel={closeDelete}
				pending={deleting}
			/>
		</article>
	);
}
