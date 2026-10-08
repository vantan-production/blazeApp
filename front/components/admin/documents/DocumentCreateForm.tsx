"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminFilePicker } from "@/components/admin/AdminFilePicker";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import { sendFormData, toErrorMessage } from "@/lib/admin/api";
import {
	DOCUMENT_MAX_FILES,
	documentCreateItemSchema,
	documentCreateSchema,
	type SavedDocument,
	titleFromFileName,
} from "@/lib/admin/documents";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import { adminRoutes } from "@/lib/admin/routes";
import { useToastStore } from "@/lib/store/useToastStore";

/** 登録する1ファイル分。key は同じファイルを2回選んでも重ならないように振る連番 */
type Item = {
	key: number;
	file: File;
	title: string;
	/** タイトル・ファイルサイズの誤り、または登録に失敗した理由 */
	error?: string;
};

type SharedValues = { category: string; description: string };

let nextItemKey = 0;
const toItem = (file: File): Item => ({
	key: nextItemKey++,
	file,
	title: titleFromFileName(file.name),
});

/**
 * 資料の新規登録（POST /api/documents。multipart/form-data）。
 * ファイルを複数選ぶと1ファイル＝1資料として1件ずつ登録する。タイトルはファイルごと、分類・説明は全ファイル共通。
 * 一部だけ失敗したときは、登録できたものを外して失敗したものだけ残し、そのまま再送できるようにする
 */
export function DocumentCreateForm() {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const [items, setItems] = useState<Item[]>([]);
	const [shared, setShared] = useState<SharedValues>({
		category: "",
		description: "",
	});
	const [errors, setErrors] = useState<
		FieldErrors<SharedValues & { items: unknown }>
	>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	const values = { ...shared, items };
	// 必要な入力がそろったらボタンを有効にする
	const canSubmit = documentCreateSchema.safeParse(values).success;

	const updateItem = (key: number, patch: Partial<Item>) =>
		setItems((prev) =>
			prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
		);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		// ファイルごとの誤りは各行に出す
		const checked = items.map((item) => {
			const result = documentCreateItemSchema.safeParse(item);
			return {
				...item,
				error: result.success ? undefined : result.error.issues[0].message,
			};
		});
		setItems(checked);
		const result = validateForm(documentCreateSchema, values);
		if (!result.success || checked.some((item) => item.error)) {
			setErrors(result.success ? {} : result.errors);
			return;
		}
		setErrors({});
		const { category, description } = result.data;

		setPending(true);
		// 1件ずつ順番に登録する（同時に送ると back のアップロードが詰まりやすいため）
		const failed: Item[] = [];
		let succeeded = 0;
		for (const [index, item] of result.data.items.entries()) {
			const formData = new FormData();
			formData.append("title", item.title);
			if (category) formData.append("category", category);
			if (description) formData.append("description", description);
			formData.append("file", item.file);
			try {
				await sendFormData<SavedDocument>("/api/documents", formData, "POST");
				succeeded++;
			} catch (error) {
				failed.push({
					...checked[index],
					error: toErrorMessage(error, "登録に失敗しました。"),
				});
			}
		}

		if (failed.length === 0) {
			showToast(
				succeeded === 1
					? "資料を登録しました。"
					: `資料を${succeeded}件登録しました。`,
			);
			router.push(adminRoutes.documents);
			return;
		}
		if (succeeded > 0) showToast(`資料を${succeeded}件登録しました。`);
		setItems(failed);
		setSubmitError(
			`${failed.length}件の登録に失敗しました。内容を確認して、もう一度「登録」を押してください。`,
		);
		setPending(false);
	};

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className="flex w-full flex-col items-center gap-9"
		>
			<div className="flex w-full flex-col gap-5">
				<div className="flex flex-col gap-1">
					<p className="text-[12px] leading-[22px] font-medium text-brand-white">
						ファイル（必須・複数選択できます）
					</p>
					<AdminFilePicker
						placeholder="配布するファイルを選択"
						multiple
						files={items.map((item) => item.file)}
						// 選び直すと追加になる（別のフォルダのファイルも続けて選べるように）。「選択を解除」では空になる
						onChange={(files) =>
							setItems((prev) =>
								files.length === 0 ? [] : [...prev, ...files.map(toItem)],
							)
						}
						error={errors.items}
					/>
					<p className="text-[12px] leading-[18px] text-brand-white/80">
						PDF・Word・Excel・画像など。1ファイル10MBまで、一度に
						{DOCUMENT_MAX_FILES}
						個まで。ファイルごとに1つの資料として登録します。
					</p>
				</div>

				{items.length > 0 && (
					<ul className="flex flex-col gap-4">
						{items.map((item) => (
							<li
								key={item.key}
								className="flex flex-col gap-1 rounded-[10px] bg-white/10 p-3"
							>
								<div className="flex items-start justify-between gap-2">
									<p className="text-[12px] leading-[18px] break-all text-brand-white/80">
										{item.file.name}
									</p>
									<button
										type="button"
										onClick={() =>
											setItems((prev) =>
												prev.filter((other) => other.key !== item.key),
											)
										}
										disabled={pending}
										className="shrink-0 text-[12px] leading-[18px] text-brand-white underline disabled:opacity-50"
									>
										外す
									</button>
								</div>
								<AdminTextField
									tone="dark"
									label="タイトル（必須）"
									placeholder="例: 2026年度 年間スケジュール"
									value={item.title}
									onChange={(event) =>
										updateItem(item.key, {
											title: event.target.value,
											error: undefined,
										})
									}
									error={item.error}
								/>
							</li>
						))}
					</ul>
				)}

				<AdminTextField
					tone="dark"
					label="分類（任意・全ファイル共通）"
					placeholder="例: 規約・スケジュール・練習メニュー"
					value={shared.category}
					onChange={(event) =>
						setShared((prev) => ({ ...prev, category: event.target.value }))
					}
					error={errors.category}
				/>
				<AdminTextField
					tone="dark"
					multiline
					label="説明（任意・全ファイル共通）"
					placeholder="資料の内容や見てほしい点など"
					value={shared.description}
					onChange={(event) =>
						setShared((prev) => ({
							...prev,
							description: event.target.value,
						}))
					}
					error={errors.description}
				/>
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
						? "登録中…"
						: items.length > 1
							? `${items.length}件を登録`
							: "登録"}
				</AdminButton>
			</div>
		</form>
	);
}
