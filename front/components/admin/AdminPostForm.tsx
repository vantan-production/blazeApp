"use client";

import { useId, useState } from "react";
import { z } from "zod";
import { sendFormData, toErrorMessage } from "@/lib/admin/api";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import { useToastStore } from "@/lib/store/useToastStore";
import { bodySchema, titleSchema } from "@/lib/validation/schemas";
import { AdminBodyImages } from "./AdminBodyImages";
import { AdminButton } from "./AdminButton";
import { AdminFilePicker } from "./AdminFilePicker";
import { AdminFieldError, AdminTextField } from "./AdminTextField";

const postSchema = z.object({
	title: titleSchema,
	body: bodySchema,
});

type PostValues = z.input<typeof postSchema>;

// back が1回の投稿で受け取れる画像の上限（back/src/utils/media.ts の MAX_FILE_COUNT）
const BODY_IMAGES_MAX = 10;

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
	/**
	 * 本文に載せる画像の設定。指定すると本文欄の右下に画像追加アイコンを出す（ニュース投稿 2255:972）。
	 * attachment（サムネイルなど）とは別のフィールド名で、複数枚まとめて送る
	 */
	bodyImages?: {
		name: string;
		accept?: string;
	};
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
	bodyImages,
	narrowFields = false,
	submitGap = "lg",
	onSuccess,
}: Props) {
	const bodyImagesId = useId();
	const showToast = useToastStore((state) => state.showToast);
	const [values, setValues] = useState<PostValues>({ title: "", body: "" });
	const [files, setFiles] = useState<File[]>([]);
	const [bodyImageFiles, setBodyImageFiles] = useState<File[]>([]);
	const [bodyImagesError, setBodyImagesError] = useState<string | null>(null);
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
		if (bodyImages) {
			for (const image of bodyImageFiles) {
				formData.append(bodyImages.name, image);
			}
		}

		setPending(true);
		try {
			await sendFormData(endpoint, formData);
			showToast(successMessage);
			setValues({ title: "", body: "" });
			setFiles([]);
			setBodyImageFiles([]);
			setBodyImagesError(null);
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
						bodyImages ? (
							// 丸い青ボタンに画像アイコン、右下に＋バッジを重ねて「画像を追加」と分かるようにする
							<label
								htmlFor={bodyImagesId}
								aria-label="本文に画像を追加"
								title="本文に画像を追加"
								className="absolute right-3 bottom-4 flex size-10 cursor-pointer items-center justify-center rounded-full bg-brand-blue text-brand-white shadow-[0px_2px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-80"
							>
								<svg
									aria-hidden="true"
									viewBox="0 0 24 24"
									fill="currentColor"
									className="size-[22px]"
								>
									<path d="M19 5V19H5V5H19ZM19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM14.14 11.86L11.14 15.73L9 13.14L6 17H18L14.14 11.86Z" />
								</svg>
								<span
									aria-hidden="true"
									className="absolute -right-1 -bottom-1 flex size-[18px] items-center justify-center rounded-full border-2 border-brand-blue bg-brand-yellow text-brand-blue"
								>
									<svg
										aria-hidden="true"
										viewBox="0 0 12 12"
										fill="none"
										stroke="currentColor"
										strokeWidth={2}
										strokeLinecap="round"
										className="size-[10px]"
									>
										<path d="M6 2v8M2 6h8" />
									</svg>
								</span>
							</label>
						) : undefined
					}
				/>
				{bodyImages && (
					<AdminBodyImages
						id={bodyImagesId}
						files={bodyImageFiles}
						onChange={(next) => {
							setBodyImageFiles(next);
							setBodyImagesError(null);
						}}
						accept={bodyImages.accept}
						max={BODY_IMAGES_MAX}
						onOverflow={() =>
							setBodyImagesError(`本文の画像は${BODY_IMAGES_MAX}枚までです。`)
						}
					/>
				)}
				{bodyImagesError && (
					<AdminFieldError message={bodyImagesError} tone="dark" />
				)}
				<AdminFilePicker
					placeholder={attachment.placeholder}
					accept={attachment.accept}
					files={files}
					onChange={setFiles}
				/>
			</div>
			<div className="flex w-full flex-col items-center gap-2">
				{submitError && <AdminFieldError message={submitError} tone="dark" />}
				<AdminButton
					type="submit"
					variant="light"
					disabled={pending || !canSubmit}
				>
					{pending ? "投稿中…" : "投稿"}
				</AdminButton>
			</div>
		</form>
	);
}
