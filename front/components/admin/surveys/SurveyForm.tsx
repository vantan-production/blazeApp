"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { AdminButton } from "@/components/admin/AdminButton";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import { toErrorMessage } from "@/lib/admin/api";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import { adminSurveyDetailPath } from "@/lib/admin/routes";
import {
	fromDateTimeLocalValue,
	isPastDateTimeLocal,
	type SurveyDetail,
	type SurveyFormValues,
	type SurveySummary,
	sendSurveyJson,
	surveyFormSchema,
	toDateTimeLocalValue,
} from "@/lib/admin/surveys";
import { useToastStore } from "@/lib/store/useToastStore";
import {
	newOptionDraft,
	type SurveyOptionDraft,
	SurveyOptionsEditor,
} from "./SurveyOptionsEditor";

type Props = {
	/** 渡すと編集（PATCH /api/surveys/:id）、省略すると新規作成（POST /api/surveys） */
	survey?: SurveyDetail;
	/** 編集時の回答済みの人数（選択肢を変えると回答が消えることを警告するのに使う） */
	respondentCount?: number;
};

const selectionModes = [
	{ value: false, label: "1つだけ選ぶ" },
	{ value: true, label: "複数選べる" },
] as const;

/**
 * アンケート・出欠確認の作成・編集フォーム（タイトル・説明・締切・選び方・選択肢）。
 * back は選択肢を送ると総入れ替えし、既存の回答も消す（back/src/survey/manage.ts）。
 * そのため編集では選択肢を変えたときだけ送り、回答がある場合は確認ダイアログを出す
 */
export function SurveyForm({ survey, respondentCount = 0 }: Props) {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const closesAtId = useId();
	const isEdit = survey !== undefined;

	const initialLabels = survey?.options.map((option) => option.label) ?? [];
	const [values, setValues] = useState<SurveyFormValues>(() => ({
		title: survey?.title ?? "",
		body: survey?.body ?? "",
		closesAt: toDateTimeLocalValue(survey?.closes_at ?? null),
		allowMultiple: survey?.allow_multiple ?? false,
		options: survey
			? survey.options.map((option) => newOptionDraft(option.label))
			: [newOptionDraft(), newOptionDraft()],
	}));
	const [errors, setErrors] = useState<FieldErrors<SurveyFormValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	// 並び順も含めて選択肢が変わったか（変わっていなければ PATCH に options を載せない）
	const optionsChanged =
		!isEdit ||
		values.options.length !== initialLabels.length ||
		values.options.some(
			(option, index) => option.label.trim() !== initialLabels[index],
		);
	// 回答が消える編集か
	const willDropResponses = isEdit && optionsChanged && respondentCount > 0;
	// 回答があるのに「複数選べる」→「1つだけ」に変える場合（既に複数選んだ回答はそのまま残る）
	const narrowingSelection =
		isEdit &&
		!optionsChanged &&
		respondentCount > 0 &&
		survey.allow_multiple &&
		!values.allowMultiple;

	// 必要な入力がそろったらボタンを有効にし、押せる状態だと見て分かるようにする
	const canSubmit = surveyFormSchema.safeParse(values).success;

	const setOptions = (options: SurveyOptionDraft[]) =>
		setValues((prev) => ({ ...prev, options }));

	/** 入力を確かめ、回答が消える編集なら確認ダイアログを開く。問題なければ送る */
	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const result = validateForm(surveyFormSchema, values);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		// 新しく作るときに過去の締切を入れると、作った瞬間から回答できないため止める
		if (!isEdit && isPastDateTimeLocal(result.data.closesAt)) {
			setErrors({ closesAt: "締切は今より後の日時にしてください。" });
			return;
		}
		setErrors({});

		if (willDropResponses) {
			setConfirmOpen(true);
			return;
		}
		submit();
	};

	const submit = async () => {
		const title = values.title.trim();
		const body = values.body.trim();
		const closesAt = fromDateTimeLocalValue(values.closesAt);
		const options = values.options.map((option, index) => ({
			label: option.label.trim(),
			sort_order: index,
		}));

		setPending(true);
		try {
			if (isEdit) {
				const res = await sendSurveyJson<SurveySummary>(
					`/api/surveys/${survey.id}`,
					{
						title,
						// 空欄にしたら説明を消す
						body: body || null,
						closes_at: closesAt,
						allow_multiple: values.allowMultiple,
						...(optionsChanged ? { options } : {}),
					},
					"PATCH",
				);
				showToast(res.message ?? "アンケートを更新しました。");
				router.push(adminSurveyDetailPath(survey.id));
			} else {
				const res = await sendSurveyJson<SurveySummary>(
					"/api/surveys",
					{
						title,
						...(body ? { body } : {}),
						...(closesAt ? { closes_at: closesAt } : {}),
						allow_multiple: values.allowMultiple,
						options,
					},
					"POST",
				);
				showToast("アンケートを作成しました。");
				router.push(adminSurveyDetailPath(res.data.id));
			}
		} catch (error) {
			setSubmitError(
				toErrorMessage(
					error,
					isEdit ? "更新に失敗しました。" : "作成に失敗しました。",
				),
			);
			setPending(false);
			setConfirmOpen(false);
		}
	};

	const closeConfirm = useCallback(() => setConfirmOpen(false), []);

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className="flex w-full flex-col items-center gap-9"
		>
			<div className="flex w-full flex-col gap-5">
				{!isEdit && (
					<p className="rounded-[10px] bg-white/10 px-3 py-2 text-[12px] leading-[18px] tracking-[1px] text-brand-white">
						ログインした関係者が回答できます。作成すると関係者に通知が届きます。
					</p>
				)}
				<AdminTextField
					tone="dark"
					label="タイトル"
					placeholder="例: 10月12日 練習試合の出欠"
					value={values.title}
					onChange={(event) =>
						setValues((prev) => ({ ...prev, title: event.target.value }))
					}
					error={errors.title}
				/>
				<AdminTextField
					tone="dark"
					multiline
					label="説明（任意）"
					placeholder="集合時間・持ち物など、回答する人に伝えたいこと"
					value={values.body}
					onChange={(event) =>
						setValues((prev) => ({ ...prev, body: event.target.value }))
					}
					error={errors.body}
				/>
				<div className="flex w-full flex-col items-start">
					<label
						htmlFor={closesAtId}
						className="mb-[2px] text-[12px] leading-[22px] font-medium text-brand-white"
					>
						締切（任意。過ぎると回答できなくなります）
					</label>
					<div className="flex w-full items-center gap-2">
						<input
							id={closesAtId}
							type="datetime-local"
							value={values.closesAt}
							onChange={(event) =>
								setValues((prev) => ({
									...prev,
									closesAt: event.target.value,
								}))
							}
							aria-invalid={errors.closesAt ? true : undefined}
							className="h-10 min-w-0 flex-1 rounded-[10px] border-[0.3px] border-black bg-brand-white px-3 text-[12px] leading-[22px] font-medium text-brand-black outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
						/>
						{values.closesAt && (
							<button
								type="button"
								onClick={() => setValues((prev) => ({ ...prev, closesAt: "" }))}
								className="shrink-0 text-[12px] leading-[22px] text-brand-white underline"
							>
								締切なしにする
							</button>
						)}
					</div>
					{errors.closesAt && (
						<AdminFieldError message={errors.closesAt} tone="dark" />
					)}
				</div>
				<fieldset className="flex w-full flex-col gap-1">
					<legend className="mb-[2px] text-[12px] leading-[22px] font-medium text-brand-white">
						選び方
					</legend>
					<div className="grid grid-cols-2 gap-1 rounded-[10px] bg-black/25 p-1">
						{selectionModes.map((mode) => {
							const selected = values.allowMultiple === mode.value;
							return (
								<button
									key={mode.label}
									type="button"
									aria-pressed={selected}
									onClick={() =>
										setValues((prev) => ({
											...prev,
											allowMultiple: mode.value,
										}))
									}
									className={`flex h-10 items-center justify-center rounded-[8px] text-[14px] leading-[22px] font-medium tracking-[1px] transition-colors ${selected ? "bg-brand-white text-brand-blue shadow-[0px_2px_4px_rgba(0,0,0,0.25)]" : "text-brand-white hover:bg-white/10"}`}
								>
									{mode.label}
								</button>
							);
						})}
					</div>
					{narrowingSelection && (
						<p className="text-[12px] leading-[18px] tracking-[1px] text-[#ffe7a3]">
							すでに複数選んで回答した人の回答はそのまま残ります。
						</p>
					)}
				</fieldset>
				<SurveyOptionsEditor
					options={values.options}
					onChange={setOptions}
					error={errors.options}
				/>
				{willDropResponses && (
					<p
						role="alert"
						className="rounded-[10px] bg-[#ffd6d6] px-3 py-2 text-[12px] leading-[18px] tracking-[1px] text-[#b00003]"
					>
						選択肢を変えると、これまでの回答（{respondentCount}
						人分）はすべて消えます。回答し直してもらう必要があります。
					</p>
				)}
			</div>
			<div className="flex w-full flex-col items-center gap-2 px-5">
				{submitError && <AdminFieldError message={submitError} tone="dark" />}
				<AdminButton
					type="submit"
					variant="light"
					size="sm"
					disabled={pending || !canSubmit}
				>
					{pending
						? isEdit
							? "更新中…"
							: "作成中…"
						: isEdit
							? "更新"
							: "作成"}
				</AdminButton>
			</div>
			<AdminActionDialog
				open={confirmOpen}
				tone="danger"
				title="これまでの回答が消えます。更新しますか？"
				description={`選択肢を変えたため、回答済みの${respondentCount}人分の回答がすべて削除されます。この操作は取り消せません。`}
				confirmLabel="回答を消して更新"
				onConfirm={submit}
				onCancel={closeConfirm}
				pending={pending}
			/>
		</form>
	);
}
