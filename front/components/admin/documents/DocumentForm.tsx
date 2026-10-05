"use client";

import { useState } from "react";
import type { z } from "zod";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminFilePicker } from "@/components/admin/AdminFilePicker";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import { sendFormData, toErrorMessage } from "@/lib/admin/api";
import {
	type AdminDocument,
	displayFileName,
	documentCreateSchema,
	documentUpdateSchema,
	type SavedDocument,
} from "@/lib/admin/documents";
import { type FieldErrors, validateForm } from "@/lib/admin/form";

type DocumentValues = z.input<typeof documentCreateSchema>;

type Props = {
	/** 編集する資料。省略すると新規登録（POST /api/documents） */
	document?: AdminDocument;
	/** 保存できたあとの処理（一覧へ戻る・一覧の行を書き換える など） */
	onSaved: (saved: SavedDocument, replacedFile: File | null) => void;
	/** 編集をやめる（編集のときだけ「キャンセル」を出す） */
	onCancel?: () => void;
};

/**
 * 資料の登録・編集フォーム（POST /api/documents・PATCH /api/documents/:id。multipart/form-data）。
 * 項目はタイトル（必須）・分類・説明・ファイル（登録時は必須、編集時は差し替えるときだけ）
 */
export function DocumentForm({ document, onSaved, onCancel }: Props) {
	const isEdit = document !== undefined;
	const schema = isEdit ? documentUpdateSchema : documentCreateSchema;
	const [values, setValues] = useState<DocumentValues>({
		title: document?.title ?? "",
		category: document?.category ?? "",
		description: document?.description ?? "",
		file: [],
	});
	const [errors, setErrors] = useState<FieldErrors<DocumentValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	// 編集では、どこかを変えたときだけ保存できるようにする
	const changed =
		!isEdit ||
		values.title.trim() !== document.title ||
		values.category.trim() !== (document.category ?? "") ||
		values.description.trim() !== (document.description ?? "") ||
		values.file.length > 0;
	// 必要な入力がそろったらボタンを有効にする
	const canSubmit = changed && schema.safeParse(values).success;

	const setField = <K extends keyof DocumentValues>(
		key: K,
		value: DocumentValues[K],
	) => setValues((prev) => ({ ...prev, [key]: value }));

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const result = validateForm(schema, values);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		const { title, category, description, file } = result.data;

		// back は説明の空欄を「変更なし」として扱うため、登録済みの説明を消すことはできない
		if (isEdit && document.description && description === "") {
			setErrors({
				description:
					"説明は空にできません。不要な場合は短い文に書き換えてください。",
			});
			return;
		}
		setErrors({});

		const formData = new FormData();
		if (isEdit) {
			// 編集は変えた項目だけ送る（分類は空文字を送ると消える）
			if (title !== document.title) formData.append("title", title);
			if (category !== (document.category ?? "")) {
				formData.append("category", category);
			}
			if (description !== (document.description ?? "")) {
				formData.append("description", description);
			}
		} else {
			formData.append("title", title);
			if (category) formData.append("category", category);
			if (description) formData.append("description", description);
		}
		const selectedFile = file[0] ?? null;
		if (selectedFile) formData.append("file", selectedFile);

		setPending(true);
		try {
			const res = await sendFormData<SavedDocument>(
				isEdit ? `/api/documents/${document.id}` : "/api/documents",
				formData,
				isEdit ? "PATCH" : "POST",
			);
			onSaved(res.data, selectedFile);
		} catch (error) {
			setSubmitError(
				toErrorMessage(
					error,
					isEdit ? "保存に失敗しました。" : "登録に失敗しました。",
				),
			);
			setPending(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className="flex w-full flex-col items-center gap-9"
		>
			<div className="flex w-full flex-col gap-5">
				<AdminTextField
					tone="dark"
					label="タイトル（必須）"
					placeholder="例: 2026年度 年間スケジュール"
					value={values.title}
					onChange={(event) => setField("title", event.target.value)}
					error={errors.title}
				/>
				<AdminTextField
					tone="dark"
					label="分類（任意）"
					placeholder="例: 規約・スケジュール・練習メニュー"
					value={values.category}
					onChange={(event) => setField("category", event.target.value)}
					error={errors.category}
				/>
				<AdminTextField
					tone="dark"
					multiline
					label="説明（任意）"
					placeholder="資料の内容や見てほしい点など"
					value={values.description}
					onChange={(event) => setField("description", event.target.value)}
					error={errors.description}
				/>
				<div className="flex flex-col gap-1">
					<p className="text-[12px] leading-[22px] font-medium text-brand-white">
						{isEdit ? "ファイルを差し替える（任意）" : "ファイル（必須）"}
					</p>
					{isEdit && document.file_name && (
						<p className="text-[12px] leading-[18px] break-all text-brand-white/80">
							いまのファイル: {displayFileName(document.file_name)}
						</p>
					)}
					<AdminFilePicker
						placeholder={
							isEdit ? "新しいファイルを選択" : "配布するファイルを選択"
						}
						files={values.file}
						onChange={(files) => setField("file", files)}
						error={errors.file}
					/>
					<p className="text-[12px] leading-[18px] text-brand-white/80">
						PDF・Word・Excel・画像など。1ファイル10MBまで。
						{isEdit && "差し替えると前のファイルは削除されます。"}
					</p>
				</div>
			</div>
			<div className="flex w-full flex-col items-center gap-3 px-5">
				{submitError && <AdminFieldError message={submitError} tone="dark" />}
				<AdminButton
					type="submit"
					variant="light"
					size="sm"
					disabled={pending || !canSubmit}
				>
					{pending
						? isEdit
							? "保存中…"
							: "登録中…"
						: isEdit
							? "保存"
							: "登録"}
				</AdminButton>
				{onCancel && (
					<button
						type="button"
						onClick={onCancel}
						disabled={pending}
						className="text-[14px] leading-[22px] tracking-[1px] text-brand-white underline disabled:opacity-50"
					>
						キャンセル
					</button>
				)}
			</div>
		</form>
	);
}
