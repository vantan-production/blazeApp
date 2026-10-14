"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { PillHeading } from "@/components/ui/PillHeading";
import { routes } from "@/lib/routes";
import { activityPlace, activitySlots } from "./data";
import { toDateValue } from "./practiceDates";
import {
	isTrialEvent,
	mapSearchUrl,
	type ScheduleEvent,
} from "./scheduleEvents";

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
	/** 表示する練習日。null のときは閉じる */
	date: Date | null;
	/** カレンダーから取り込んだその日の予定。null（未連携）なら活動日時・活動場所を表示する */
	events: ScheduleEvent[] | null;
	onClose: () => void;
};

/** 外部リンクの下線付きテキスト（地図を開く） */
function MapLink({ href, label }: { href: string; label: string }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="flex items-center gap-1 border-b-[1.5px] border-brand-blue text-[14px] tracking-[1px]"
		>
			{label}
			<Image src="/icons/external-link.svg" alt="" width={16} height={16} />
		</a>
	);
}

/** カレンダーの予定のある日をタップしたときに開く、時間・場所・体験案内のモーダル */
export function PracticeDayDialog({ date, events, onClose }: Props) {
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
	// カレンダー連携時は、通常練習・体験会のある日だけ体験の申し込みを案内する
	const canTrial = events ? events.some(isTrialEvent) : true;

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

					{events ? (
						<ul className="flex w-full flex-col">
							{events.map((event, i) => (
								<li
									// 同じ日に同名の予定が並ぶこともあるため位置も含める
									// biome-ignore lint/suspicious/noArrayIndexKey: 予定は並び替えない
									key={`${event.title}-${i}`}
									className={`flex flex-col items-center gap-2 py-4 text-center first:pt-0 last:pb-0 ${
										i > 0 ? "border-t border-brand-blue/20" : ""
									}`}
								>
									<p className="text-[18px] font-medium tracking-[1px] break-all">
										{event.title}
									</p>
									<p className="text-[16px] tracking-[1px]">
										{event.time ?? "終日"}
									</p>
									{event.location && (
										<>
											<p className="text-[14px] tracking-[1px] break-all">
												{event.location}
											</p>
											<MapLink
												href={mapSearchUrl(event.location)}
												label="地図を見る"
											/>
										</>
									)}
								</li>
							))}
						</ul>
					) : (
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
										<MapLink href={mapLink.href} label={mapLink.label} />
									)}
								</dd>
							</div>
						</dl>
					)}

					{/* タップした練習日を体験希望日として選んだ状態でフォームを開く。大会などの日には出さない */}
					{canTrial && (
						<Link
							href={`${routes.trial}?date=${toDateValue(date)}`}
							className="flex h-12 w-full items-center justify-center rounded-[1000px] bg-brand-yellow text-[18px] font-medium tracking-[1px]"
						>
							体験を申し込む
						</Link>
					)}
				</div>
			)}
		</dialog>
	);
}
