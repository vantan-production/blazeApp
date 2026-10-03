"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { z } from "zod";
import { sendFormData, toErrorMessage } from "@/lib/admin/api";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import { useToastStore } from "@/lib/store/useToastStore";
import { bodySchema, titleSchema } from "@/lib/validation/schemas";
import { AdminButton } from "./AdminButton";
import { AdminFilePicker } from "./AdminFilePicker";
import { AdminFieldError, AdminTextField } from "./AdminTextField";

const postSchema = z.object({
	title: titleSchema,
	body: bodySchema,
});

type PostValues = z.input<typeof postSchema>;

type Props = {
	/** 送信先のAPI（multipart/form-data で POST する） */
	endpoint: string;
	/**
	 * 添付欄の設定。name は back が受け取るフィールド名（image / file など）。
	 * 選んだファイルの種類で送り先を変えたい場合（実績の画像/動画/ファイル）は関数を渡す
	 */
	attachment: {
		name: string | ((file: File) => string);
		placeholder: string;
		accept?: string;
	};
	/** 投稿成功時のトースト文言 */
	successMessage: string;
	/** タイトル欄と本文欄の間に差し込む追加の入力欄（ニュースのカテゴリーなど） */
	extraFields?: React.ReactNode;
	/** FormData に追加で載せる値（undefined は送らない） */
	extraValues?: Record<string, string | undefined>;
	/** 本文欄の右下にアイコンを出し、添付欄の選択ダイアログを開けるようにする（ニュース投稿 2255:972） */
	bodyAttachmentShortcut?: boolean;
	/** 添付欄を左右20pxずつ内側に寄せる（ニュース投稿のアイキャッチ 308px 幅） */
	insetAttachment?: boolean;
	/** 入力欄全体を左右20pxずつ内側に寄せる（メディア情報は入力欄も 308px 幅） */
	narrowFields?: boolean;
	/** 入力欄と投稿ボタンの間隔（Figma: ニュース 36px / メディア・実績 82px） */
	submitGap?: "sm" | "lg";
	/** 投稿成功後の処理（一覧の再取得など） */
	onSuccess?: () => void;
};

/**
 * タイトル・本文・添付・投稿ボタンからなる投稿フォーム
 * （Figma: ニュース投稿 2030:1587 / メディア情報 2039:1726 / 実績更新 2034:1628 の共通部分）
 */
export function AdminPostForm({
	endpoint,
	attachment,
	successMessage,
	extraFields,
	extraValues,
	bodyAttachmentShortcut = false,
	insetAttachment = false,
	narrowFields = false,
	submitGap = "lg",
	onSuccess,
}: Props) {
	const attachmentId = useId();
	const showToast = useToastStore((state) => state.showToast);
	const [values, setValues] = useState<PostValues>({ title: "", body: "" });
	const [files, setFiles] = useState<File[]>([]);
	const [errors, setErrors] = useState<FieldErrors<PostValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	// タイトル・本文が投稿できる内容になったらボタンを有効にし、押せる状態だと見て分かるようにする
	const canSubmit = postSchema.safeParse(values).success;

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const result = validateForm(postSchema, values);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setErrors({});

		const formData = new FormData();
		formData.append("title", result.data.title);
		formData.append("body", result.data.body);
		for (const [key, value] of Object.entries(extraValues ?? {})) {
			if (value !== undefined) formData.append(key, value);
		}
		const file = files[0];
		if (file) {
			const fieldName =
				typeof attachment.name === "function"
					? attachment.name(file)
					: attachment.name;
			formData.append(fieldName, file);
		}

		setPending(true);
		try {
			await sendFormData(endpoint, formData);
			showToast(successMessage);
			setValues({ title: "", body: "" });
			setFiles([]);
			onSuccess?.();
		} catch (error) {
			setSubmitError(toErrorMessage(error, "投稿に失敗しました。"));
		} finally {
			setPending(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className={`flex w-full flex-col items-center ${submitGap === "sm" ? "gap-9" : "gap-[82px]"}`}
		>
			<div
				className={`flex w-full flex-col gap-5 ${narrowFields ? "px-5" : ""}`}
			>
				<AdminTextField
					tone="dark"
					label="タイトル"
					placeholder="タイトル名"
					value={values.title}
					onChange={(event) =>
						setValues((prev) => ({ ...prev, title: event.target.value }))
					}
					error={errors.title}
				/>
				{extraFields}
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
					adornment={
						bodyAttachmentShortcut ? (
							<label
								htmlFor={attachmentId}
								aria-label="画像を選択"
								className="absolute right-[5px] bottom-[5px] flex size-6 cursor-pointer items-center justify-center"
							>
								<Image
									src="/icons/admin/photo-small.svg"
									alt=""
									width={24}
									height={24}
								/>
							</label>
						) : undefined
					}
				/>
				<div className={insetAttachment ? "px-5" : ""}>
					<AdminFilePicker
						id={attachmentId}
						placeholder={attachment.placeholder}
						accept={attachment.accept}
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
					{pending ? "投稿中…" : "投稿"}
				</AdminButton>
			</div>
		</form>
	);
}
