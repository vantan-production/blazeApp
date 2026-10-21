"use client";

import { useEffect } from "react";
import { useToastStore } from "@/lib/store/useToastStore";

const AUTO_DISMISS_MS = 3000;

/** 管理画面の送信結果などを画面下に表示するトースト（lib/store/useToastStore の表示側） */
export function AdminToaster() {
	const toasts = useToastStore((state) => state.toasts);
	const dismissToast = useToastStore((state) => state.dismissToast);

	// 表示から一定時間で自動的に消す
	useEffect(() => {
		const timers = toasts.map((toast) =>
			setTimeout(() => dismissToast(toast.id), AUTO_DISMISS_MS),
		);
		return () => {
			for (const timer of timers) clearTimeout(timer);
		};
	}, [toasts, dismissToast]);

	return (
		<div
			aria-live="polite"
			className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
		>
			{toasts.map((toast) => (
				<p
					key={toast.id}
					role="status"
					className={`w-full max-w-[348px] rounded-[10px] px-4 py-2 text-center text-[14px] leading-[22px] tracking-[1px] shadow-[0px_4px_4px_rgba(0,0,0,0.15)] ${
						toast.variant === "success"
							? "bg-[#d1f0ae] text-[#006b00]"
							: "bg-[#ffd6d6] text-[#b00003]"
					}`}
				>
					{toast.message}
				</p>
			))}
		</div>
	);
}
