"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { adminRoutes, adminTrialNoticeDetailPath } from "@/lib/admin/routes";
import type { TrialNoticeRecipient } from "./types";

export type SendFailure = {
	failed: TrialNoticeRecipient[];
	/** 同じ送信で届いた人数（0 なら全員失敗） */
	sentCount: number;
	/** back が返した文言（message / errors） */
	message: string | null;
};

type Props = {
	failure: SendFailure;
	/** この画面で一部送信済みとして保存された送信履歴の id（古い順） */
	savedNoticeIds: string[];
	onRetry: () => void;
	disabled: boolean;
};

/** 送信に失敗した宛先の一覧と再送ボタン。件名・本文はそのまま残し、失敗した方だけに送り直せるようにする */
export function SendFailurePanel({
	failure,
	savedNoticeIds,
	onRetry,
	disabled,
}: Props) {
	const panelRef = useRef<HTMLDivElement>(null);

	// 送信ボタンの下に出るので、表示したらここへスクロール・フォーカスして気付けるようにする。
	// 再送のたびに親が key を変えて作り直すので、マウント時だけでよい
	useEffect(() => {
		panelRef.current?.focus();
	}, []);

	const { failed, sentCount, message } = failure;
	const latestNoticeId = savedNoticeIds.at(-1);

	return (
		<div
			ref={panelRef}
			tabIndex={-1}
			role="alert"
			className="flex w-full flex-col gap-3 rounded-[10px] bg-[#ffd6d6] px-4 py-3 text-[12px] leading-[18px] tracking-[1px] text-[#b00003] outline-none"
		>
			<p className="text-[14px] leading-[22px] font-medium">
				{sentCount > 0
					? `${failed.length}名への送信に失敗しました（${sentCount}名には送信済みで、送信履歴に保存しました）。`
					: `${failed.length}名全員への送信に失敗しました。送信履歴には保存されていません。`}
			</p>
			{message && <p>{message}</p>}
			<ul className="flex flex-col gap-1">
				{failed.map((recipient) => (
					<li key={recipient.application_id} className="break-all">
						{recipient.name}（{recipient.email}）
					</li>
				))}
			</ul>
			{latestNoticeId && (
				<Link
					href={
						savedNoticeIds.length > 1
							? adminRoutes.trialNotices
							: adminTrialNoticeDetailPath(latestNoticeId)
					}
					className="underline"
				>
					{savedNoticeIds.length > 1
						? "送信済みの分を送信履歴で見る"
						: "送信済みの分の送信履歴を見る"}
				</Link>
			)}
			<AdminButton
				variant="primary"
				size="sm"
				onClick={onRetry}
				disabled={disabled}
				className="text-[16px]"
			>
				失敗した方に再送する
			</AdminButton>
		</div>
	);
}
