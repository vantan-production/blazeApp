"use client";

import { useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import {
	formatNoticeDateTime,
	type NoticeReader,
	type NoticeReadStatus,
	noticeReaderRoleLabel,
	toReadRate,
} from "@/lib/admin/notices";
import { ApiError, apiClient } from "@/lib/apiClient";

type Props = {
	noticeId: string;
};

// まだ読んでいない人に声をかけるのが主な目的なので、未読を先に出す
const tabs = [
	{ value: "unread", label: "未読" },
	{ value: "read", label: "既読" },
] as const;

type Tab = (typeof tabs)[number]["value"];

/**
 * お知らせの既読状況（GET /api/notices/:id/reads）。
 * 既読率の横棒と、未読者・既読者を名前で一覧する。対象は削除済みを除く全ユーザー（back の仕様）
 */
export function NoticeReadStatusSection({ noticeId }: Props) {
	const [status, setStatus] = useState<NoticeReadStatus | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<Tab>("unread");

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<NoticeReadStatus>>(`/api/notices/${noticeId}/reads`)
			.then((res) => {
				if (!ignore) setStatus(res.data);
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 403
						? "既読状況は投稿担当・オーナーだけが見られます。"
						: "既読状況の取得に失敗しました。",
				);
			});
		return () => {
			ignore = true;
		};
	}, [noticeId]);

	return (
		<section
			aria-labelledby="notice-read-status"
			className="flex flex-col gap-4 rounded-[14px] bg-white/10 p-4"
		>
			<h3
				id="notice-read-status"
				className="text-[16px] leading-[22px] font-medium tracking-[1px]"
			>
				既読状況
			</h3>
			{error && <p className="text-[14px]">{error}</p>}
			{!error && !status && <p className="text-[14px]">読み込み中…</p>}
			{status && (
				<>
					<ReadRateBar status={status} />
					<div
						role="tablist"
						aria-label="表示する人"
						className="flex gap-2 self-start"
					>
						{tabs.map((item) => (
							<button
								key={item.value}
								type="button"
								role="tab"
								aria-selected={tab === item.value}
								onClick={() => setTab(item.value)}
								className={`h-8 rounded-full px-4 text-[14px] leading-[22px] tracking-[1px] ring-1 ring-white/60 transition-opacity hover:opacity-80 ${tab === item.value ? "bg-brand-white text-brand-blue" : "bg-brand-blue text-brand-white"}`}
							>
								{item.label}{" "}
								{item.value === "unread"
									? status.unread_count
									: status.read_count}
								人
							</button>
						))}
					</div>
					<ReaderList
						readers={tab === "unread" ? status.unread : status.read}
						emptyMessage={
							tab === "unread"
								? "全員が読みました。"
								: "まだ誰も読んでいません。"
						}
					/>
				</>
			)}
		</section>
	);
}

/** 既読率の横棒（例: 12 / 30人が既読 40%） */
function ReadRateBar({ status }: { status: NoticeReadStatus }) {
	const rate = toReadRate(status);
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-baseline justify-between gap-2">
				<p className="text-[14px] leading-[22px] tracking-[1px]">
					{status.total}人中 {status.read_count}人が既読
				</p>
				<p className="text-[22px] leading-[22px] font-medium tracking-[1px]">
					{rate}%
				</p>
			</div>
			<div
				// 割合は上の文字で読めるので、横棒は見た目だけにする
				aria-hidden
				className="h-3 w-full overflow-hidden rounded-full bg-black/30"
			>
				<div
					className="h-full rounded-full bg-brand-yellow"
					style={{ width: `${rate}%` }}
				/>
			</div>
		</div>
	);
}

type ReaderListProps = {
	readers: NoticeReader[];
	emptyMessage: string;
};

/** 既読者・未読者の名前の一覧。既読者には読んだ日時を添える */
function ReaderList({ readers, emptyMessage }: ReaderListProps) {
	if (readers.length === 0) {
		return <p className="text-[14px] opacity-80">{emptyMessage}</p>;
	}
	return (
		<ul className="flex flex-col">
			{readers.map((reader) => (
				<li
					key={reader.id}
					className="flex items-center justify-between gap-2 border-b border-white/20 py-2 last:border-b-0"
				>
					<div className="flex min-w-0 items-center gap-2">
						<span className="truncate text-[14px] leading-[22px] tracking-[1px]">
							{reader.name}
						</span>
						<span className="shrink-0 rounded-[200px] bg-white/15 px-2 text-[11px] leading-[18px] tracking-[1px]">
							{noticeReaderRoleLabel[reader.role] ?? reader.role}
						</span>
					</div>
					{reader.read_at && (
						<time className="shrink-0 text-[12px] leading-[18px] tracking-[0.5px] opacity-80">
							{formatNoticeDateTime(reader.read_at)}
						</time>
					)}
				</li>
			))}
		</ul>
	);
}
