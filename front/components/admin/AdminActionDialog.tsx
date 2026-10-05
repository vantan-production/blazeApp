"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
	open: boolean;
	/** 見出し（例: この投稿を削除しますか？） */
	title: string;
	/** 見出しの下に出す補足（何が起きるか・取り消せるか） */
	description?: string;
	/** 対象の画像を小さく見せる（取り下げ依頼など、どの写真の話か確認させたいとき） */
	imageUrl?: string | null;
	confirmLabel: string;
	cancelLabel?: string;
	/** danger: 削除など取り消せない操作。確定ボタンを赤にする */
	tone?: "default" | "danger";
	/** 確定処理の実行中はボタンを押せなくする */
	pending?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

/**
 * 管理画面の確認ダイアログ（見出し＋補足＋左右に並ぶボタン）。
 * ConfirmDialog（はい/いいえだけの小さい確認）より、何が起きるかを説明したい操作で使う
 */
export function AdminActionDialog({
	open,
	title,
	description,
	imageUrl,
	confirmLabel,
	cancelLabel = "キャンセル",
	tone = "default",
	pending = false,
	onConfirm,
	onCancel,
}: Props) {
	const titleId = useId();
	const descriptionId = useId();
	const cancelRef = useRef<HTMLButtonElement>(null);

	// 開いたら「キャンセル」にフォーカスし、Escで閉じられるようにする（誤って確定しないように）
	useEffect(() => {
		if (!open) return;
		cancelRef.current?.focus();
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !pending) onCancel();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, pending, onCancel]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center px-6">
			{/* 背景をタップしても閉じる */}
			<button
				type="button"
				aria-label="閉じる"
				tabIndex={-1}
				disabled={pending}
				onClick={onCancel}
				className="absolute inset-0 bg-black/50"
			/>
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={description ? descriptionId : undefined}
				className="relative flex w-full max-w-[320px] flex-col gap-5 rounded-[20px] bg-brand-white px-5 pt-6 pb-5 shadow-[0px_8px_24px_rgba(0,0,0,0.3)]"
			>
				{imageUrl && (
					// biome-ignore lint/performance/noImgElement: S3の署名付きURLは期限付きで next/image の最適化対象にしない
					<img
						src={imageUrl}
						alt=""
						className="h-[140px] w-full rounded-[10px] bg-black/10 object-cover"
					/>
				)}
				<div className="flex flex-col gap-2 text-center">
					<h2
						id={titleId}
						className="text-[17px] leading-[26px] font-medium tracking-[0.5px] text-brand-black"
					>
						{title}
					</h2>
					{description && (
						<p
							id={descriptionId}
							className="text-[13px] leading-[20px] tracking-[0.5px] text-brand-black/70"
						>
							{description}
						</p>
					)}
				</div>
				<div className="grid grid-cols-2 gap-3">
					<button
						ref={cancelRef}
						type="button"
						onClick={onCancel}
						disabled={pending}
						className="h-11 rounded-[10px] border border-brand-blue/30 text-[15px] leading-[22px] font-medium tracking-[1px] text-brand-blue transition-opacity hover:opacity-80 disabled:opacity-50"
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={pending}
						className={`h-11 rounded-[10px] text-[15px] leading-[22px] font-medium tracking-[1px] text-white shadow-[0px_2px_4px_rgba(0,0,0,0.2)] transition-opacity hover:opacity-80 disabled:opacity-50 ${tone === "danger" ? "bg-[#d93036]" : "bg-brand-blue"}`}
					>
						{pending ? "処理中…" : confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
