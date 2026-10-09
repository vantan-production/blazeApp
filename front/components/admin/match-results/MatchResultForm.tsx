"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { AdminButton } from "@/components/admin/AdminButton";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import { sendJson, toErrorMessage } from "@/lib/admin/api";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import {
	emptyMatchResultForm,
	type MatchResult,
	type MatchResultFormValues,
	matchResultFormSchema,
	toMatchResultForm,
	toMatchResultPayload,
} from "@/lib/admin/matchResults";
import { adminRoutes } from "@/lib/admin/routes";
import { apiClient } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";

type Props = {
	/** 渡すと編集（PATCH /api/match-results/:id・削除も可）、省略すると新規登録（POST） */
	result?: MatchResult;
};

/**
 * 試合結果の登録・編集フォーム（大会名・大会成績・試合日・対戦相手・両チームの得点）。
 * 公開ページの「前回の試合結果」には試合日が最も新しい1件が出る
 */
export function MatchResultForm({ result }: Props) {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const isEdit = result !== undefined;

	const [values, setValues] = useState<MatchResultFormValues>(() =>
		result ? toMatchResultForm(result) : emptyMatchResultForm,
	);
	const [errors, setErrors] = useState<FieldErrors<MatchResultFormValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	// 必要な入力がそろったらボタンを有効にし、押せる状態だと見て分かるようにする
	const canSubmit = matchResultFormSchema.safeParse(values).success;

	const field =
		(key: keyof MatchResultFormValues) =>
		(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
			setValues((prev) => ({ ...prev, [key]: event.target.value }));

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const validated = validateForm(matchResultFormSchema, values);
		if (!validated.success) {
			setErrors(validated.errors);
			return;
		}
		setErrors({});

		setPending(true);
		try {
			const payload = toMatchResultPayload(values);
			if (isEdit) {
				await sendJson(`/api/match-results/${result.id}`, payload, "PATCH");
				showToast("試合結果を更新しました。");
			} else {
				await sendJson("/api/match-results", payload, "POST");
				showToast("試合結果を登録しました。");
			}
			router.push(adminRoutes.matchResults);
		} catch (error) {
			setSubmitError(
				toErrorMessage(
					error,
					isEdit ? "更新に失敗しました。" : "登録に失敗しました。",
				),
			);
			setPending(false);
		}
	};

	const handleDelete = async () => {
		if (!result) return;
		setPending(true);
		try {
			await apiClient(`/api/match-results/${result.id}`, { method: "DELETE" });
			showToast("試合結果を削除しました。");
			router.push(adminRoutes.matchResults);
		} catch (error) {
			setSubmitError(toErrorMessage(error, "削除に失敗しました。"));
			setPending(false);
			setDeleteOpen(false);
		}
	};

	const closeDelete = useCallback(() => setDeleteOpen(false), []);

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className="flex w-full flex-col items-center gap-9"
		>
			<div className="flex w-full flex-col gap-5">
				<AdminTextField
					tone="dark"
					label="大会名"
					placeholder="例: 西尾市長杯ドッジボール大会"
					value={values.tournamentName}
					onChange={field("tournamentName")}
					error={errors.tournamentName}
				/>
				<AdminTextField
					tone="dark"
					label="大会成績（任意）"
					placeholder="例: ベスト8・準優勝・優勝"
					value={values.tournamentResult}
					onChange={field("tournamentResult")}
					error={errors.tournamentResult}
				/>
				<AdminTextField
					tone="dark"
					type="date"
					label="試合日"
					value={values.playedOn}
					onChange={field("playedOn")}
					error={errors.playedOn}
				/>
				<AdminTextField
					tone="dark"
					label="対戦相手"
					placeholder="例: 〇〇ドッジボールクラブ"
					value={values.opponentName}
					onChange={field("opponentName")}
					error={errors.opponentName}
				/>
				<div className="grid grid-cols-2 gap-3">
					<AdminTextField
						tone="dark"
						type="text"
						inputMode="numeric"
						label="西尾ブレイズの得点"
						placeholder="例: 9"
						value={values.ourScore}
						onChange={field("ourScore")}
						error={errors.ourScore}
					/>
					<AdminTextField
						tone="dark"
						type="text"
						inputMode="numeric"
						label="相手の得点"
						placeholder="例: 8"
						value={values.opponentScore}
						onChange={field("opponentScore")}
						error={errors.opponentScore}
					/>
				</div>
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
							: "登録中…"
						: isEdit
							? "更新"
							: "登録"}
				</AdminButton>
				{isEdit && (
					<button
						type="button"
						onClick={() => setDeleteOpen(true)}
						disabled={pending}
						className="mt-4 text-[14px] leading-[22px] tracking-[1px] text-[#ffb3b3] underline disabled:opacity-50"
					>
						この試合結果を削除
					</button>
				)}
			</div>
			{isEdit && (
				<AdminActionDialog
					open={deleteOpen}
					tone="danger"
					title="この試合結果を削除しますか？"
					description="公開ページからも消えます。この操作は取り消せません。"
					confirmLabel="削除する"
					onConfirm={handleDelete}
					onCancel={closeDelete}
					pending={pending}
				/>
			)}
		</form>
	);
}
