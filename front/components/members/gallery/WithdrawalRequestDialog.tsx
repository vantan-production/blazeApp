"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AdminFieldError } from "@/components/admin/AdminTextField";
import { toErrorMessage } from "@/lib/admin/api";
import { memberApi } from "@/lib/members/api";
import type { MemberGalleryImage } from "@/lib/members/gallery";
import {
	CONSENT_REASON_MAX,
	consentReasonSchema,
} from "@/lib/members/validation";

type Props = {
	/** 依頼の対象。null なら閉じている */
	image: MemberGalleryImage | null;
	onClose: () => void;
	/** 依頼を送れたとき */
	onSent: (image: MemberGalleryImage) => void;
};

/**
 * 写真の掲載取り下げを依頼するダイアログ（POST /api/consent-requests）。
 * どの写真の話か分かるよう対象を小さく見せ、理由（任意）を書いて送る。
 * 見た目は管理画面の AdminActionDialog に合わせている
 */
export function WithdrawalRequestDialog({ image, onClose, onSent }: Props) {
	const titleId = useId();
	const reasonId = useId();
	const cancelRef = useRef<HTMLButtonElement>(null);
	const [reason, setReason] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const open = image !== null;

	// 開いたら「キャンセル」にフォーカスし、Escで閉じられるようにする（送信中は閉じない）
	useEffect(() => {
		if (!open) return;
		cancelRef.current?.focus();
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !pending) onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, pending, onClose]);

	if (!image) return null;

	const close = () => {
		if (!pending) onClose();
	};

	const submit = async () => {
		const parsed = consentReasonSchema.safeParse(reason);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message ?? null);
			return;
		}
		setError(null);
		setPending(true);
		try {
			await memberApi("/api/consent-requests", {
				method: "POST",
				body: {
					image_id: image.id,
					// 空なら送らない（理由は任意）
					...(parsed.data ? { reason: parsed.data } : {}),
				},
			});
			onSent(image);
		} catch (err) {
			setError(toErrorMessage(err, "依頼の送信に失敗しました。"));
		} finally {
			setPending(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center px-6">
			{/* 背景をタップしても閉じる */}
			<button
				type="button"
				aria-label="閉じる"
				tabIndex={-1}
				disabled={pending}
				onClick={close}
				className="absolute inset-0 bg-black/50"
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				className="relative flex max-h-[90dvh] w-full max-w-[320px] flex-col gap-4 overflow-y-auto rounded-[20px] bg-brand-white px-5 pt-6 pb-5 shadow-[0px_8px_24px_rgba(0,0,0,0.3)]"
			>
				{/* biome-ignore lint/performance/noImgElement: S3の署名付きURLは期限付きで next/image の最適化対象にしない */}
				<img
					src={image.url}
					alt=""
					className="h-[140px] w-full rounded-[10px] bg-black/10 object-cover"
				/>
				<div className="flex flex-col gap-2 text-center">
					<h2
						id={titleId}
						className="text-[17px] leading-[26px] font-medium tracking-[0.5px] text-brand-black"
					>
						この写真の掲載取り下げを依頼しますか？
					</h2>
					<p className="text-[13px] leading-[20px] tracking-[0.5px] text-brand-black/70">
						チームの管理者が確認し、ホームページへの掲載を取りやめるか判断します。
					</p>
				</div>
				<div className="flex flex-col gap-1">
					<label
						htmlFor={reasonId}
						className="text-[12px] leading-[22px] font-medium text-[#505050]"
					>
						理由（任意・{CONSENT_REASON_MAX}文字以内）
					</label>
					<textarea
						id={reasonId}
						value={reason}
						maxLength={CONSENT_REASON_MAX}
						onChange={(event) => setReason(event.target.value)}
						placeholder="例: 子どもの顔がはっきり写っているため"
						className="h-24 w-full resize-none rounded-[10px] border-[0.3px] border-black bg-[rgba(242,242,247,0.4)] px-[10px] py-2 text-[12px] leading-[20px] text-brand-black outline-none placeholder:text-[rgba(80,80,80,0.4)] focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
					/>
					{error && <AdminFieldError message={error} />}
				</div>
				<div className="grid grid-cols-2 gap-3">
					<button
						ref={cancelRef}
						type="button"
						onClick={close}
						disabled={pending}
						className="h-11 rounded-[10px] border border-brand-blue/30 text-[15px] leading-[22px] font-medium tracking-[1px] text-brand-blue transition-opacity hover:opacity-80 disabled:opacity-50"
					>
						キャンセル
					</button>
					<button
						type="button"
						onClick={submit}
						disabled={pending}
						className="h-11 rounded-[10px] bg-[#d93036] text-[15px] leading-[22px] font-medium tracking-[1px] text-white shadow-[0px_2px_4px_rgba(0,0,0,0.2)] transition-opacity hover:opacity-80 disabled:opacity-50"
					>
						{pending ? "送信中…" : "依頼する"}
					</button>
				</div>
			</div>
		</div>
	);
}
