"use client";

import { useEffect, useState } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import { toErrorMessage } from "@/lib/admin/api";
import { memberApi } from "@/lib/members/api";
import { formatDate, formatDateTime } from "@/lib/members/format";
import type { SurveyDetail, SurveyResponseInput } from "@/lib/members/surveys";
import {
	SURVEY_COMMENT_MAX,
	surveyCommentSchema,
} from "@/lib/members/validation";
import { useToastStore } from "@/lib/store/useToastStore";

type Props = {
	surveyId: string;
};

/**
 * アンケート・出欠の回答画面（GET /api/surveys/:id → POST /api/surveys/:id/responses）。
 * 単一選択はラジオ、複数選択はチェックボックス。回答済みでも締切までは選び直して送り直せる（back が上書きする）。
 * 締切後は自分の回答を表示するだけにする（back も 400 を返す）
 */
export function SurveyAnswerForm({ surveyId }: Props) {
	const showToast = useToastStore((state) => state.showToast);
	const [survey, setSurvey] = useState<SurveyDetail | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [selected, setSelected] = useState<string[]>([]);
	const [comment, setComment] = useState("");
	const [commentError, setCommentError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	useEffect(() => {
		let current = true;
		memberApi<SurveyDetail>(`/api/surveys/${surveyId}`)
			.then((res) => {
				if (!current) return;
				setSurvey(res.data);
				// 前回の回答を初期値にして、選び直しやすくする
				setSelected(res.data.my_response.option_ids);
				setComment(res.data.my_response.comment ?? "");
				setLoadError(null);
			})
			.catch((err: unknown) => {
				if (current) {
					setLoadError(toErrorMessage(err, "アンケートの取得に失敗しました。"));
				}
			});
		return () => {
			current = false;
		};
	}, [surveyId]);

	if (loadError) {
		return (
			<p role="alert" className="text-[14px] text-brand-white">
				{loadError}
			</p>
		);
	}
	if (!survey) {
		return <p className="text-[14px] text-brand-white">読み込み中…</p>;
	}

	const hasResponded = survey.my_response.option_ids.length > 0;
	const closed = survey.is_closed;
	const inputType = survey.allow_multiple ? "checkbox" : "radio";

	const toggle = (optionId: string) => {
		setSubmitError(null);
		if (!survey.allow_multiple) {
			setSelected([optionId]);
			return;
		}
		setSelected((prev) =>
			prev.includes(optionId)
				? prev.filter((id) => id !== optionId)
				: [...prev, optionId],
		);
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		if (selected.length === 0) {
			setSubmitError("選択肢を1つ以上選んでください。");
			return;
		}
		const parsedComment = surveyCommentSchema.safeParse(comment);
		if (!parsedComment.success) {
			setCommentError(parsedComment.error.issues[0]?.message ?? null);
			return;
		}
		setCommentError(null);

		const payload: SurveyResponseInput = {
			option_ids: selected,
			// 空のコメントは送らない（back は空文字を「コメントなし」として扱う）
			...(parsedComment.data ? { comment: parsedComment.data } : {}),
		};

		setPending(true);
		try {
			const res = await memberApi<{
				option_ids: string[];
				comment: string | null;
			}>(`/api/surveys/${surveyId}/responses`, {
				method: "POST",
				body: payload,
			});
			setSurvey((prev) => (prev ? { ...prev, my_response: res.data } : prev));
			showToast(hasResponded ? "回答を更新しました。" : "回答を送りました。");
		} catch (error) {
			setSubmitError(toErrorMessage(error, "回答の送信に失敗しました。"));
		} finally {
			setPending(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className="flex w-full flex-col gap-[30px] text-brand-white"
		>
			<section className="flex flex-col gap-3 rounded-[20px] bg-brand-white px-5 py-5 text-brand-black">
				<h2 className="text-[20px] leading-[28px] font-medium tracking-[1px] break-all">
					{survey.title}
				</h2>
				<dl className="flex flex-col gap-1 text-[12px] leading-[18px] tracking-[1px] text-brand-black/70">
					<div className="flex gap-2">
						<dt>作成日</dt>
						<dd>
							{formatDate(survey.created_at)}（{survey.admin_name}）
						</dd>
					</div>
					<div className="flex gap-2">
						<dt>締切</dt>
						<dd>
							{survey.closes_at ? formatDateTime(survey.closes_at) : "なし"}
						</dd>
					</div>
				</dl>
				{survey.body && (
					<p className="text-[15px] leading-[26px] tracking-[0.5px] whitespace-pre-wrap break-all">
						{survey.body}
					</p>
				)}
			</section>

			{closed && (
				<p className="rounded-[10px] border border-white/60 px-4 py-3 text-[14px] leading-[22px] tracking-[1px]">
					このアンケートは締め切られました。
					{hasResponded
						? "あなたの回答は以下のとおりです。"
						: "回答はありません。"}
				</p>
			)}
			{!closed && hasResponded && (
				<p className="rounded-[10px] border border-white/60 px-4 py-3 text-[14px] leading-[22px] tracking-[1px]">
					回答済みです。締切までは選び直して送り直せます。
				</p>
			)}

			<fieldset className="flex flex-col gap-3" disabled={closed || pending}>
				<legend className="mb-3 text-[16px] leading-[22px] font-medium tracking-[1px]">
					{survey.allow_multiple
						? "あてはまるものをすべて選んでください"
						: "1つ選んでください"}
				</legend>
				{survey.options.map((option) => {
					const checked = selected.includes(option.id);
					return (
						<label
							key={option.id}
							className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[10px] px-4 py-2 text-[16px] leading-[22px] tracking-[1px] transition-colors has-disabled:cursor-default ${checked ? "bg-brand-white text-brand-blue" : "ring-1 ring-white/60"}`}
						>
							<input
								type={inputType}
								name="survey-option"
								value={option.id}
								checked={checked}
								onChange={() => toggle(option.id)}
								className="size-5 shrink-0 accent-brand-blue"
							/>
							<span className="break-all">{option.label}</span>
						</label>
					);
				})}
			</fieldset>

			{(!closed || comment) && (
				<AdminTextField
					tone="dark"
					multiline
					label={`コメント（任意・${SURVEY_COMMENT_MAX}文字以内）`}
					placeholder="欠席の理由や連絡事項など"
					value={comment}
					maxLength={SURVEY_COMMENT_MAX}
					readOnly={closed}
					onChange={(event) => setComment(event.target.value)}
					error={commentError ?? undefined}
				/>
			)}

			{!closed && (
				<div className="flex w-full flex-col items-center gap-2 px-5">
					{submitError && <AdminFieldError message={submitError} tone="dark" />}
					<AdminButton
						type="submit"
						variant="light"
						size="sm"
						disabled={pending || selected.length === 0}
					>
						{pending ? "送信中…" : hasResponded ? "回答を更新" : "回答する"}
					</AdminButton>
				</div>
			)}
		</form>
	);
}
