"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { z } from "zod";
import { AdminBodyImages } from "@/components/admin/AdminBodyImages";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminFilePicker } from "@/components/admin/AdminFilePicker";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import { sendFormData, toErrorMessage } from "@/lib/admin/api";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import { adminRoutes } from "@/lib/admin/routes";
import { useToastStore } from "@/lib/store/useToastStore";

// back/src/gameImg/create.ts は1回に最大10枚（back/src/utils/media.ts の validateMultipleFiles）。
// サムネイル1枚を除いた残りが記事内の画像の上限
const BODY_IMAGES_MAX = 9;

const gameImageSchema = z.object({
	// back/src/gameImg/create.ts は画像1枚以上が必須で、先頭の1枚をメイン画像（一覧のサムネイル）にする
	thumbnail: z
		.array(z.instanceof(File))
		.length(1, "サムネイル画像を選択してください。"),
	bodyImages: z.array(z.instanceof(File)).max(BODY_IMAGES_MAX),
	message: z.string().trim(),
});

type GameImageValues = z.input<typeof gameImageSchema>;

/** 試合風景の画像アップロードフォーム（Figma: game 2034:1657）。POST /api/gameImg に送信し、成功したら一覧へ戻る */
export function GameImageForm() {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const bodyImagesId = useId();
	const [thumbnail, setThumbnail] = useState<File[]>([]);
	const [bodyImages, setBodyImages] = useState<File[]>([]);
	const [bodyImagesError, setBodyImagesError] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [errors, setErrors] = useState<FieldErrors<GameImageValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	// サムネイル画像が選ばれたらボタンを有効にし、押せる状態だと見て分かるようにする
	const canSubmit = gameImageSchema.safeParse({
		thumbnail,
		bodyImages,
		message,
	}).success;

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const result = validateForm(gameImageSchema, {
			thumbnail,
			bodyImages,
			message,
		});
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setErrors({});

		const formData = new FormData();
		// サムネイルを先頭に送り、back でメイン画像として扱わせる。記事内の画像はその後ろに続ける
		for (const image of [...result.data.thumbnail, ...result.data.bodyImages]) {
			formData.append("image", image);
		}
		// TODO: 一言メッセージは API（POST /api/gameImg）に項目が無いため未送信。デザイン注記でも「要検討」

		setPending(true);
		try {
			await sendFormData("/api/gameImg", formData);
			showToast("試合風景を投稿しました。");
			setThumbnail([]);
			setBodyImages([]);
			setBodyImagesError(null);
			setMessage("");
			router.push(adminRoutes.game);
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
					placeholder="サムネイル画像を選択"
					accept="image/*"
					height={200}
					files={thumbnail}
					onChange={setThumbnail}
					error={errors.thumbnail}
				/>
				{/* 記事内の画像。ニュース投稿の本文の画像と同じ選択欄で、選んだ画像を小さく並べて1枚ずつ外せる */}
				<label
					htmlFor={bodyImagesId}
					className="flex h-10 cursor-pointer items-center justify-center gap-2 self-start rounded-full bg-brand-blue px-4 text-[14px] leading-[22px] tracking-[1px] text-brand-white shadow-[0px_2px_4px_rgba(0,0,0,0.25)] ring-1 ring-white/60 transition-opacity hover:opacity-80"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="currentColor"
						className="size-5"
					>
						<path d="M19 5V19H5V5H19ZM19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM14.14 11.86L11.14 15.73L9 13.14L6 17H18L14.14 11.86Z" />
					</svg>
					記事内に画像を追加
				</label>
				<AdminBodyImages
					id={bodyImagesId}
					files={bodyImages}
					onChange={(next) => {
						setBodyImages(next);
						setBodyImagesError(null);
					}}
					accept="image/*"
					max={BODY_IMAGES_MAX}
					label="記事内の画像"
					onOverflow={() =>
						setBodyImagesError(`記事内の画像は${BODY_IMAGES_MAX}枚までです。`)
					}
				/>
				{bodyImagesError && (
					<AdminFieldError message={bodyImagesError} tone="dark" />
				)}
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
