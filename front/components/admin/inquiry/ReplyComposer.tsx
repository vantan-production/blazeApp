"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { z } from "zod";
import { AdminFieldError } from "@/components/admin/AdminTextField";
import { type ApiSuccess, sendFormData, toErrorMessage } from "@/lib/admin/api";
import { validateForm } from "@/lib/admin/form";
import { useToastStore } from "@/lib/store/useToastStore";
import { VALIDATION_LIMITS } from "@/lib/validation/limits";
import {
	bodySchema,
	type InquiryStatus,
	titleSchema,
} from "@/lib/validation/schemas";
import type { InquiryReply, ReplyMailStatus } from "./types";

/**
 * POST /api/inquiry/:id/reply のレスポンス
 * （data に加えてメールの送信結果と、返信後の対応ステータスが返る。未対応なら back が対応中にする）
 */
type ReplyResponse = ApiSuccess<InquiryReply> & {
	mail_status: ReplyMailStatus;
	inquiry_status: InquiryStatus;
};

const replySchema = z.object({
	title: titleSchema,
	body: bodySchema,
});

/** 返信のタイトル。チャット形式でタイトル欄が無いため「Re: 問い合わせ件名」を上限内で付ける */
const replyTitleOf = (inquiryTitle: string) =>
	`Re: ${inquiryTitle}`.slice(0, VALIDATION_LIMITS.title.max);

type Props = {
	inquiryId: string;
	inquiryTitle: string;
	/** 返信を送れたら呼ぶ（詳細の再取得） */
	onSent: () => void;
	/** 「済」ボタン（対応済にする）を押したとき */
	onResolve: () => void;
	/** 返信後の「対応済みにする」を押したとき（確認ダイアログを挟まずに対応済みにする） */
	onResolveNow: () => void;
	/** すでに対応済なら「済」ボタンを押せなくする */
	resolved: boolean;
	/** 対応ステータスの更新中 */
	resolving: boolean;
};

/**
 * 画面下部の返信入力欄（Figma: Frame 212 2421:970 の下部）。
 * 画像添付＋メッセージ入力＋「済」ボタン。POST /api/inquiry/:id/reply に送信する。
 * 返信は問い合わせ元にもメールで届くため、送信結果（back の message）をトーストで知らせる。
 *
 * 「済」の押し忘れを防ぐため、対応済みでない問い合わせに返信したら、入力欄の上に
 * 「対応済みにする」を出す（やり取りを続けるなら無視して次のメッセージを打てば消える）
 */
export function ReplyComposer({
	inquiryId,
	inquiryTitle,
	onSent,
	onResolve,
	onResolveNow,
	resolved,
	resolving,
}: Props) {
	const showToast = useToastStore((state) => state.showToast);
	const imageInputId = useId();
	const imageInputRef = useRef<HTMLInputElement>(null);
	const [message, setMessage] = useState("");
	const [image, setImage] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	// 返信直後に「対応済みにしますか？」を出しているか
	const [askResolve, setAskResolve] = useState(false);

	const clearImage = () => {
		setImage(null);
		if (imageInputRef.current) imageInputRef.current.value = "";
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);

		const result = validateForm(replySchema, {
			title: replyTitleOf(inquiryTitle),
			body: message,
		});
		if (!result.success) {
			setError(result.errors.body ?? result.errors.title ?? null);
			return;
		}

		const formData = new FormData();
		formData.append("title", result.data.title);
		formData.append("body", result.data.body);
		if (image) formData.append("image", image);

		setPending(true);
		try {
			const res = (await sendFormData<InquiryReply>(
				`/api/inquiry/${inquiryId}/reply`,
				formData,
			)) as ReplyResponse;
			setMessage("");
			clearImage();
			setAskResolve(res.inquiry_status !== "resolved");
			onSent();
			// 返信自体は保存できていても、メールだけ失敗することがある（詳細の吹き出しから再送できる）
			showToast(
				res.message ?? "返信を投稿しました。",
				res.mail_status === "failed" ? "error" : "success",
			);
		} catch (err) {
			setError(toErrorMessage(err, "返信の送信に失敗しました。"));
		} finally {
			setPending(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-sp flex-col gap-1 bg-brand-blue px-[35px] pt-2 pb-[10px]"
		>
			{error && <AdminFieldError message={error} tone="dark" />}
			{askResolve && !resolved && (
				<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-[18px] text-brand-white">
					<span>やり取りが終わったら対応済みにしましょう。</span>
					<span className="flex items-center gap-2">
						<button
							type="button"
							onClick={onResolveNow}
							disabled={resolving}
							className="rounded-[6px] bg-[#d1f0ae] px-2 text-[12px] leading-[22px] tracking-[1px] text-[#00af00] disabled:opacity-50"
						>
							対応済みにする
						</button>
						<button
							type="button"
							onClick={() => setAskResolve(false)}
							className="underline"
						>
							あとで
						</button>
					</span>
				</p>
			)}
			{image && (
				<p className="flex items-center gap-2 text-[12px] leading-[18px] text-brand-white">
					<span className="truncate">添付: {image.name}</span>
					<button type="button" onClick={clearImage} className="underline">
						取り消す
					</button>
				</p>
			)}
			<div className="flex items-center gap-2">
				<label
					htmlFor={imageInputId}
					aria-label="画像を添付"
					className="flex size-8 shrink-0 cursor-pointer items-center justify-center"
				>
					<Image src="/icons/admin/photo.svg" alt="" width={32} height={32} />
				</label>
				<input
					ref={imageInputRef}
					id={imageInputId}
					type="file"
					accept="image/*"
					className="sr-only"
					onChange={(event) => setImage(event.currentTarget.files?.[0] ?? null)}
				/>
				<input
					type="text"
					aria-label="返信メッセージ"
					placeholder="メッセージを入力"
					enterKeyHint="send"
					value={message}
					onChange={(event) => {
						setMessage(event.target.value);
						// 続けて返信を書き始めたら、対応済みの案内は引っ込める
						setAskResolve(false);
					}}
					disabled={pending}
					className="h-8 min-w-0 flex-1 rounded-[20px] bg-white px-[11px] text-[12px] font-medium text-brand-black outline-none placeholder:text-[rgba(80,80,80,0.4)] focus:ring-1 focus:ring-brand-yellow"
				/>
				{/* TODO: 送信ボタンはデザインに無いため、Enter（キーボードの送信）で送る */}
				<button
					type="button"
					onClick={onResolve}
					disabled={resolved}
					aria-label="対応済にする"
					className="flex h-[30px] w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#d1f0ae] text-[16px] leading-[16px] tracking-[1.5px] text-[#00af00] disabled:opacity-50"
				>
					済
				</button>
			</div>
		</form>
	);
}
