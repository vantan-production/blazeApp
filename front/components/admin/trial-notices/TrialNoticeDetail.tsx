"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type ApiSuccess, toErrorMessage } from "@/lib/admin/api";
import { adminRoutes } from "@/lib/admin/routes";
import { ApiError, apiClient } from "@/lib/apiClient";
import {
	formatSentAt,
	formatTrialDate,
	type TrialNoticeDetailData,
} from "./types";

type Props = {
	noticeId: string;
};

/** 送信履歴の詳細（件名・本文・送信者・宛先） */
export function TrialNoticeDetail({ noticeId }: Props) {
	const [notice, setNotice] = useState<TrialNoticeDetailData | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// id が変わった後に前の応答が返ってきても上書きしないようにする
		let ignore = false;
		const load = async () => {
			try {
				const res = await apiClient<ApiSuccess<TrialNoticeDetailData>>(
					`/api/trial-notices/${noticeId}`,
				);
				if (!ignore) setNotice(res.data);
			} catch (err) {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 404
						? "この送信履歴は見つかりませんでした。"
						: toErrorMessage(err, "送信履歴の取得に失敗しました。"),
				);
			}
		};
		load();
		return () => {
			ignore = true;
		};
	}, [noticeId]);

	if (error) {
		return (
			<p className="px-[27px] pt-[38px] text-[14px] text-brand-white">
				{error}
			</p>
		);
	}
	if (!notice) {
		return (
			<p className="px-[27px] pt-[38px] text-[14px] text-brand-white">
				読み込み中…
			</p>
		);
	}

	const meta = [
		{ label: "送信日時", value: formatSentAt(notice.created_at) },
		{ label: "送信者", value: notice.admin_name },
		{ label: "宛先", value: `${notice.recipient_count}名` },
	];

	return (
		<main className="flex w-full flex-1 flex-col gap-[38px] px-[27px] pt-[38px] pb-12 text-white">
			<header className="flex flex-col items-start gap-[10px]">
				<Link
					href={adminRoutes.trialNotices}
					className="text-[12px] leading-[18px] tracking-[1px] text-brand-white underline"
				>
					送信履歴へ戻る
				</Link>
				<h1 className="text-[22px] leading-[26px] font-medium tracking-[1px] break-all text-brand-white">
					{notice.title}
				</h1>
				<dl className="grid w-full grid-cols-[88px_1fr] gap-x-[10px] gap-y-[2px] rounded-[10px] border border-brand-white px-[10px] py-[5px] leading-[22px] tracking-[1px]">
					{meta.map((row) => (
						<div key={row.label} className="contents">
							<dt className="text-[10px]">{row.label}</dt>
							<dd className="text-[12px] break-all">{row.value}</dd>
						</div>
					))}
				</dl>
			</header>

			<section
				aria-labelledby="trial-notice-body"
				className="flex flex-col gap-2"
			>
				<h2
					id="trial-notice-body"
					className="text-[14px] leading-[22px] tracking-[1px]"
				>
					本文
				</h2>
				{/* 管理者が入力した改行をそのまま見せる */}
				<p className="rounded-[10px] bg-brand-white px-[10px] py-2 text-[12px] leading-[22px] tracking-[1px] whitespace-pre-wrap break-all text-brand-black">
					{notice.body}
				</p>
			</section>

			<section
				aria-labelledby="trial-notice-recipients"
				className="flex flex-col gap-2"
			>
				<h2
					id="trial-notice-recipients"
					className="text-[14px] leading-[22px] tracking-[1px]"
				>
					宛先（{notice.recipients.length}名）
				</h2>
				<ul className="flex flex-col gap-2">
					{notice.recipients.map((recipient) => (
						<li
							key={recipient.application_id}
							className="flex flex-col border border-brand-white px-3 py-2 text-[12px] leading-[18px] tracking-[1px]"
						>
							<span className="text-[16px] leading-[22px] break-all">
								{recipient.name}
							</span>
							<span className="break-all">{recipient.email}</span>
							<span>体験日 {formatTrialDate(recipient.trial_date)}</span>
							<span>送信 {formatSentAt(recipient.sent_at)}</span>
						</li>
					))}
				</ul>
			</section>
		</main>
	);
}
