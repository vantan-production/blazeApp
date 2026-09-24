"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { PillHeading } from "@/components/ui/PillHeading";
import { routes } from "@/lib/routes";
import { activityPlace, activitySlots } from "./data";

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
	/** 表示する練習日。null のときは閉じる */
	date: Date | null;
	onClose: () => void;
};

/** カレンダーの練習日をタップしたときに開く、練習時間・場所・体験案内のモーダル */
export function PracticeDayDialog({ date, onClose }: Props) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (date && !dialog.open) dialog.showModal();
		if (!date && dialog.open) dialog.close();
	}, [date]);

	const slot = date
		? activitySlots.find((s) => s.days.includes(date.getDay()))
		: undefined;
	const mapLink = activityPlace.links[0];

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: 背景クリックで閉じる補助操作。キーボードはEscで閉じられる
		<dialog
			ref={dialogRef}
			onClose={onClose}
			onClick={(event) => {
				// ダイアログ外側（背景）をクリックしたときだけ閉じる
				if (event.target === event.currentTarget) onClose();
			}}
			aria-labelledby="practice-day-title"
			className="m-auto w-[min(354px,calc(100%-32px))] rounded-[20px] bg-brand-white p-0 text-brand-blue backdrop:bg-black/60"
		>
			{date && (
				<div className="relative flex flex-col items-center gap-6 px-5 pt-8 pb-6">
					<button
						type="button"
						onClick={onClose}
						aria-label="閉じる"
						className="absolute top-3 right-3 flex size-9 cursor-pointer items-center justify-center rounded-full text-[24px] leading-none"
					>
						×
					</button>
					<p
						id="practice-day-title"
						className="text-[22px] leading-[22px] font-medium tracking-[1px]"
					>
						{`${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`}
					</p>

					<dl className="flex w-full flex-col gap-5">
						<div className="flex flex-col items-center gap-2">
							<dt>
								<PillHeading variant="label" as="h3">
									練習時間
								</PillHeading>
							</dt>
							<dd className="text-[20px] font-medium tracking-[1px]">
								{slot?.time ?? "練習はありません"}
							</dd>
						</div>
						<div className="flex flex-col items-center gap-2">
							<dt>
								<PillHeading variant="label" as="h3">
									練習場所
								</PillHeading>
							</dt>
							<dd className="flex flex-col items-center gap-2">
								<span className="text-[18px] font-medium tracking-[1px]">
									{activityPlace.name}
								</span>
								{mapLink && (
									<a
										href={mapLink.href}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 border-b-[1.5px] border-brand-blue text-[14px] tracking-[1px]"
									>
										{mapLink.label}
										<Image
											src="/icons/external-link.svg"
											alt=""
											width={16}
											height={16}
										/>
									</a>
								)}
							</dd>
						</div>
					</dl>

					<Link
						href={routes.trial}
						className="flex h-12 w-full items-center justify-center rounded-[1000px] bg-brand-yellow text-[18px] font-medium tracking-[1px]"
					>
						体験を申し込む
					</Link>
				</div>
			)}
		</dialog>
	);
}
