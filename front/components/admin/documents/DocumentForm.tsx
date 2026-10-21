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
	documentUpdateSchema,
	type SavedDocument,
} from "@/lib/admin/documents";
import { type FieldErrors, validateForm } from "@/lib/admin/form";

type DocumentValues = z.input<typeof documentUpdateSchema>;

type Props = {
	/** 編集する資料 */
	document: AdminDocument;
	/** 保存できたあとの処理（一覧の行を書き換える など） */
	onSaved: (saved: SavedDocument, replacedFile: File | null) => void;
	/** 編集をやめる */
	onCancel: () => void;
};

/**
 * 資料の編集フォーム（PATCH /api/documents/:id。multipart/form-data）。
 * 項目はタイトル（必須）・分類・説明・ファイル（差し替えるときだけ）。
 * 新規登録は複数ファイルをまとめて登録できる DocumentCreateForm を使う
 */
export function DocumentForm({ document, onSaved, onCancel }: Props) {
	const [values, setValues] = useState<DocumentValues>({
		title: document.title,
		category: document.category ?? "",
		description: document.description ?? "",
		file: [],
	});
	const [errors, setErrors] = useState<FieldErrors<DocumentValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	// どこかを変えたときだけ保存できるようにする
	const changed =
		values.title.trim() !== document.title ||
		values.category.trim() !== (document.category ?? "") ||
		values.description.trim() !== (document.description ?? "") ||
		values.file.length > 0;
	// 必要な入力がそろったらボタンを有効にする
	const canSubmit = changed && documentUpdateSchema.safeParse(values).success;

	const setField = <K extends keyof DocumentValues>(
		key: K,
		value: DocumentValues[K],
	) => setValues((prev) => ({ ...prev, [key]: value }));

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const result = validateForm(documentUpdateSchema, values);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		const { title, category, description, file } = result.data;

		// back は説明の空欄を「変更なし」として扱うため、登録済みの説明を消すことはできない
		if (document.description && description === "") {
			setErrors({
				description:
					"説明は空にできません。不要な場合は短い文に書き換えてください。",
			});
			return;
		}
		setErrors({});

		// 変えた項目だけ送る（分類は空文字を送ると消える）
		const formData = new FormData();
		if (title !== document.title) formData.append("title", title);
		if (category !== (document.category ?? "")) {
			formData.append("category", category);
		}
		if (description !== (document.description ?? "")) {
			formData.append("description", description);
		}
		const selectedFile = file[0] ?? null;
		if (selectedFile) formData.append("file", selectedFile);

		setPending(true);
		try {
			const res = await sendFormData<SavedDocument>(
				`/api/documents/${document.id}`,
				formData,
				"PATCH",
			);
			onSaved(res.data, selectedFile);
		} catch (error) {
			setSubmitError(toErrorMessage(error, "保存に失敗しました。"));
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
						ファイルを差し替える（任意）
					</p>
					{document.file_name && (
						<p className="text-[12px] leading-[18px] break-all text-brand-white/80">
							いまのファイル: {displayFileName(document.file_name)}
						</p>
					)}
					<AdminFilePicker
						placeholder="新しいファイルを選択"
						files={values.file}
						onChange={(files) => setField("file", files)}
						error={errors.file}
					/>
					<p className="text-[12px] leading-[18px] text-brand-white/80">
						PDF・Word・Excel・画像など。1ファイル10MBまで。
						差し替えると前のファイルは削除されます。
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
					{pending ? "保存中…" : "保存"}
				</AdminButton>
				<button
					type="button"
					onClick={onCancel}
					disabled={pending}
					className="text-[14px] leading-[22px] tracking-[1px] text-brand-white underline disabled:opacity-50"
				>
					キャンセル
				</button>
			</div>
		</form>
	);
}
