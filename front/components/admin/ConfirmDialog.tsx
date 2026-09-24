"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
	open: boolean;
	/** 確認文（例: 対応済に変更しますか？） */
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
	confirmLabel?: string;
	cancelLabel?: string;
	/** 確定処理の実行中はボタンを押せなくする */
	pending?: boolean;
};

/** はい/いいえの確認ダイアログ（Figma: Frame 217 2424:1052） */
export function ConfirmDialog({
	open,
	message,
	onConfirm,
	onCancel,
	confirmLabel = "はい",
	cancelLabel = "いいえ",
	pending = false,
}: Props) {
	const messageId = useId();
	const cancelRef = useRef<HTMLButtonElement>(null);

	// 開いたら「いいえ」にフォーカスし、Escで閉じられるようにする
	useEffect(() => {
		if (!open) return;
		cancelRef.current?.focus();
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onCancel();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, onCancel]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={messageId}
				className="flex w-full max-w-[296px] flex-col items-center gap-[19px] rounded-[20px] bg-brand-white px-[2px] py-[13px]"
			>
				<p
					id={messageId}
					className="w-full text-center text-[16px] leading-[22px] tracking-[1.5px] text-brand-black"
				>
					{message}
				</p>
				<div className="flex w-full items-center justify-center gap-[30px]">
					<button
						ref={cancelRef}
						type="button"
						onClick={onCancel}
						disabled={pending}
						className="h-8 w-[100px] bg-[#ffd6d6] text-[16px] leading-[22px] tracking-[1.5px] text-[#ff0004] disabled:opacity-50"
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={pending}
						className="h-8 w-[100px] bg-[#d1f0ae] text-[16px] leading-[22px] tracking-[1.5px] text-[#00af00] disabled:opacity-50"
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
