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
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import {
	type Notice,
	type NoticeFormValues,
	noticeFormSchema,
} from "@/lib/admin/notices";
import { adminNoticeDetailPath } from "@/lib/admin/routes";
import { useToastStore } from "@/lib/store/useToastStore";

type Props = {
	/** 渡すと編集（PATCH /api/notices/:id）、省略すると新規作成（POST /api/notices） */
	notice?: Notice;
};

/**
 * 関係者向けお知らせの作成・編集フォーム（タイトル・カテゴリー・本文・画像）。
 * multipart/form-data で送る（back/src/news/create.ts・update.ts が parseBody で受け取るため）。
 * 公開範囲は back が常に「関係者限定」にするので、入力欄は置かずに説明だけ出す
 */
export function NoticeForm({ notice }: Props) {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const isEdit = notice !== undefined;

	const [values, setValues] = useState<NoticeFormValues>({
		title: notice?.title ?? "",
		body: notice?.body ?? "",
		category: notice?.category ?? "",
	});
	const [files, setFiles] = useState<File[]>([]);
	const [errors, setErrors] = useState<FieldErrors<NoticeFormValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	// 必要な入力がそろったらボタンを有効にし、押せる状態だと見て分かるようにする
	const canSubmit = noticeFormSchema.safeParse(values).success;

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const result = validateForm(noticeFormSchema, values);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setErrors({});

		const formData = new FormData();
		formData.append("title", result.data.title);
		formData.append("body", result.data.body);
		// 編集では空文字を送るとカテゴリーが外れる。新規作成では空なら送らない
		if (isEdit || result.data.category) {
			formData.append("category", result.data.category);
		}
		const file = files[0];
		if (file) formData.append("image", file);

		setPending(true);
		try {
			const res = isEdit
				? await sendFormData<Notice>(
						`/api/notices/${notice.id}`,
						formData,
						"PATCH",
					)
				: await sendFormData<Notice>("/api/notices", formData);
			showToast(
				isEdit ? "お知らせを更新しました。" : "お知らせを作成しました。",
			);
			router.push(adminNoticeDetailPath(isEdit ? notice.id : res.data.id));
		} catch (error) {
			setSubmitError(
				toErrorMessage(
					error,
					isEdit ? "更新に失敗しました。" : "作成に失敗しました。",
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
				<p className="rounded-[10px] bg-white/10 px-3 py-2 text-[12px] leading-[18px] tracking-[1px] text-brand-white">
					お知らせはログインした関係者だけが見られます（公開サイトには出ません）。
					{isEdit ? "" : "作成すると関係者に通知が届きます。"}
				</p>
				<AdminTextField
					tone="dark"
					label="タイトル"
					placeholder="例: 10月の練習日程について"
					value={values.title}
					onChange={(event) =>
						setValues((prev) => ({ ...prev, title: event.target.value }))
					}
					error={errors.title}
				/>
				<AdminTextField
					tone="dark"
					label="カテゴリー（任意）"
					placeholder="例: 練習・連絡・持ち物"
					value={values.category}
					onChange={(event) =>
						setValues((prev) => ({ ...prev, category: event.target.value }))
					}
					error={errors.category}
				/>
				<AdminTextField
					tone="dark"
					multiline
					label="本文"
					placeholder="本文を入力"
					value={values.body}
					onChange={(event) =>
						setValues((prev) => ({ ...prev, body: event.target.value }))
					}
					error={errors.body}
				/>
				<div className="flex flex-col gap-1">
					<span className="text-[12px] leading-[22px] font-medium text-brand-white">
						画像（任意）
					</span>
					{isEdit && notice.img_url && files.length === 0 && (
						<div className="flex items-center gap-3">
							{/* biome-ignore lint/performance/noImgElement: S3の署名付きURLは期限付きで next/image の最適化対象にしない */}
							<img
								src={notice.img_url}
								alt="現在の画像"
								className="aspect-[4/3] w-[96px] rounded-[8px] bg-black/10 object-cover"
							/>
							<p className="text-[12px] leading-[18px] tracking-[1px] text-brand-white opacity-80">
								現在の画像です。下で新しい画像を選ぶと差し替わります。
							</p>
						</div>
					)}
					<AdminFilePicker
						placeholder={
							isEdit && notice.img_url ? "画像を差し替える" : "画像を選択"
						}
						accept="image/*"
						files={files}
						onChange={setFiles}
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
							: "作成中…"
						: isEdit
							? "更新"
							: "作成"}
				</AdminButton>
			</div>
		</form>
	);
}
