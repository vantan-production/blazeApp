"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
	type InquiryStatus,
	inquiryStatusSchema,
} from "@/lib/validation/schemas";
import { InquiryStatusBadge } from "./InquiryStatusBadge";

type Props = {
	status: InquiryStatus;
	onSelect: (status: InquiryStatus) => void;
	disabled?: boolean;
};

/**
 * ステータスバッジを押すと、白いメニューから対応ステータスを選び直せる（Figma: Frame 216 2424:1028）
 */
export function InquiryStatusMenu({ status, onSelect, disabled }: Props) {
	const menuId = useId();
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// メニューの外側を押したら閉じる
	useEffect(() => {
		if (!open) return;
		const handlePointerDown = (event: PointerEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, [open]);

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={menuId}
				aria-label="対応ステータスを変更"
				disabled={disabled}
				onClick={() => setOpen((prev) => !prev)}
			>
				<InquiryStatusBadge status={status} />
			</button>
			{open && (
				<div
					id={menuId}
					role="menu"
					className="absolute top-full left-0 z-10 mt-1 flex w-24 flex-col items-center gap-2 bg-white py-4"
				>
					{inquiryStatusSchema.options.map((option) => (
						<div key={option} role="none">
							<button
								type="button"
								role="menuitemradio"
								aria-checked={option === status}
								onClick={() => {
									setOpen(false);
									if (option !== status) onSelect(option);
								}}
							>
								<InquiryStatusBadge status={option} />
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
