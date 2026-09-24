"use client";

import { useState } from "react";
import { z } from "zod";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminFilePicker } from "@/components/admin/AdminFilePicker";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import { sendFormData, toErrorMessage } from "@/lib/admin/api";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import { useToastStore } from "@/lib/store/useToastStore";

const gameImageSchema = z.object({
	// back/src/gameImg/create.ts は画像1枚以上が必須（複数枚まとめて投稿できる）。
	// 1回に送れるのは最大10枚（back/src/utils/media.ts の validateMultipleFiles）なので、送信前に止める
	images: z
		.array(z.instanceof(File))
		.min(1, "画像を選択してください。")
		.max(10, "画像は最大10枚までです。"),
	message: z.string().trim(),
});

type GameImageValues = z.input<typeof gameImageSchema>;

/** 試合風景の画像アップロードフォーム（Figma: game 2034:1657） */
export function GameImageForm() {
	const showToast = useToastStore((state) => state.showToast);
	const [images, setImages] = useState<File[]>([]);
	const [message, setMessage] = useState("");
	const [errors, setErrors] = useState<FieldErrors<GameImageValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const result = validateForm(gameImageSchema, { images, message });
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setErrors({});

		const formData = new FormData();
		for (const image of result.data.images) formData.append("image", image);
		// TODO: 一言メッセージは API（POST /api/gameImg）に項目が無いため未送信。デザイン注記でも「要検討」

		setPending(true);
		try {
			await sendFormData("/api/gameImg", formData);
			showToast("試合風景を更新しました。");
			setImages([]);
			setMessage("");
		} catch (error) {
			setSubmitError(toErrorMessage(error, "アップロードに失敗しました。"));
		} finally {
			setPending(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className="flex w-full flex-1 flex-col justify-between gap-12"
		>
			<div className="flex w-full flex-col gap-5">
				<AdminFilePicker
					placeholder="画像をアップロード"
					accept="image/*"
					multiple
					height={200}
					files={images}
					onChange={setImages}
					error={errors.images}
				/>
				<AdminTextField
					tone="dark"
					placeholder="メッセージを追加"
					value={message}
					onChange={(event) => setMessage(event.target.value)}
					error={errors.message}
				/>
			</div>
			<div className="flex w-full flex-col items-center gap-2">
				{submitError && <AdminFieldError message={submitError} tone="dark" />}
				<AdminButton type="submit" variant="light" size="sm" disabled={pending}>
					{pending ? "更新中…" : "更新"}
				</AdminButton>
			</div>
		</form>
	);
}
