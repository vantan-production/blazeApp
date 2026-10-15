"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { type ApiSuccess, sendJson, toErrorMessage } from "@/lib/admin/api";
import { apiClient } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";
import {
	INQUIRY_STATUS_LABELS,
	type InquiryStatus,
} from "@/lib/validation/schemas";
import { CustomerInfoCard } from "./CustomerInfoCard";
import { InquiryStatusMenu } from "./InquiryStatusMenu";
import { ReplyComposer } from "./ReplyComposer";
import type { InquiryDetailData, InquiryReply } from "./types";

type Props = {
	inquiryId: string;
};

type BubbleProps = {
	body: string;
	imageUrl: string | null;
	/** customer: お客様（左・白） / admin: 管理者の返信（右・緑） */
	from: "customer" | "admin";
	caption?: string;
	/** 吹き出しの下に添える補足（返信メールの送信状況など） */
	footer?: ReactNode;
};

/** チャット形式の吹き出し（Figma: Frame 211 2421:969 / Frame 212 2421:971） */
function MessageBubble({ body, imageUrl, from, caption, footer }: BubbleProps) {
	const isAdmin = from === "admin";
	return (
		<li
			className={`flex max-w-[230px] flex-col gap-1 ${isAdmin ? "self-end items-end" : "self-start items-start"}`}
		>
			<div
				className={`flex flex-col gap-1 rounded-[10px] px-[6px] py-[2px] text-[12px] leading-[22px] tracking-[1px] whitespace-pre-wrap break-all text-brand-black ${isAdmin ? "bg-[#9efe6a]" : "bg-brand-white"}`}
			>
				{body}
				{imageUrl && (
					// biome-ignore lint/performance/noImgElement: S3の署名付きURLは期限付きで next/image の最適化対象にしない
					<img
						src={imageUrl}
						alt="添付画像"
						className="max-h-48 w-full rounded-[6px] object-cover"
					/>
				)}
			</div>
			{caption && (
				<span className="text-[10px] leading-[14px] text-brand-white">
					{caption}
				</span>
			)}
			{footer}
		</li>
	);
}

type ReplyMailNoteProps = {
	reply: InquiryReply;
	/** 問い合わせにメールアドレスがあるか（email 欄追加前の問い合わせには無い） */
	hasAddress: boolean;
	onResend: (reply: InquiryReply) => void;
	resending: boolean;
};

/**
 * 返信メールの送信状況。送れていない返信には「再送」ボタンを出す
 * （POST /api/inquiry/:id/reply/:reply_id/mail）
 */
function ReplyMailNote({
	reply,
	hasAddress,
	onResend,
	resending,
}: ReplyMailNoteProps) {
	if (!hasAddress) return null;
	if (reply.mail_sent_at) {
		return (
			<span className="text-[10px] leading-[14px] text-brand-white">
				メール送信済み
			</span>
		);
	}
	return (
		<span className="flex items-center gap-2 text-[10px] leading-[14px] text-brand-yellow">
			メール未送信
			<button
				type="button"
				onClick={() => onResend(reply)}
				disabled={resending}
				className="underline disabled:opacity-50"
			>
				{resending ? "送信中…" : "再送する"}
			</button>
		</span>
	);
}

/** 問い合わせ詳細（Figma: inquiry 2027:1238）。お客様の問い合わせと返信をチャット形式で表示する */
export function InquiryDetail({ inquiryId }: Props) {
	const showToast = useToastStore((state) => state.showToast);
	const [inquiry, setInquiry] = useState<InquiryDetailData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [updating, setUpdating] = useState(false);
	const [resendingId, setResendingId] = useState<string | null>(null);

	// setState は取得後だけで行う（effect から同期的に呼ばない: react-hooks/set-state-in-effect）
	const load = useCallback(
		() =>
			apiClient<ApiSuccess<InquiryDetailData>>(`/api/inquiry/${inquiryId}`)
				.then((res) => setInquiry(res.data))
				.catch((err) =>
					setError(toErrorMessage(err, "問い合わせの取得に失敗しました。")),
				),
		[inquiryId],
	);

	useEffect(() => {
		load();
	}, [load]);

	const updateStatus = async (status: InquiryStatus) => {
		setUpdating(true);
		try {
			await apiClient(`/api/inquiry/${inquiryId}/status`, {
				method: "PATCH",
				body: JSON.stringify({ status }),
			});
			setInquiry((prev) => (prev ? { ...prev, status } : prev));
			showToast(
				`対応ステータスを「${INQUIRY_STATUS_LABELS[status]}」に更新しました。`,
			);
		} catch (err) {
			showToast(
				toErrorMessage(err, "対応ステータスの更新に失敗しました。"),
				"error",
			);
		} finally {
			setUpdating(false);
			setConfirmOpen(false);
		}
	};

	const closeConfirm = useCallback(() => setConfirmOpen(false), []);

	const resendMail = async (reply: InquiryReply) => {
		setResendingId(reply.id);
		try {
			const res = await sendJson<InquiryReply>(
				`/api/inquiry/${inquiryId}/reply/${reply.id}/mail`,
				{},
			);
			showToast(res.message ?? "返信メールを送信しました。");
			await load();
		} catch (err) {
			showToast(
				toErrorMessage(err, "返信メールの送信に失敗しました。"),
				"error",
			);
		} finally {
			setResendingId(null);
		}
	};

	if (error) {
		return (
			<p className="px-[27px] pt-[38px] text-[14px] text-brand-white">
				{error}
			</p>
		);
	}
	if (!inquiry) {
		return (
			<p className="px-[27px] pt-[38px] text-[14px] text-brand-white">
				読み込み中…
			</p>
		);
	}

	// API は返信を新しい順で返すため、チャット表示用に古い順へ並べ替える
	const replies = [...inquiry.replies].reverse();

	return (
		<>
			<main className="flex w-full flex-1 flex-col gap-[38px] px-[27px] pt-[38px] pb-[120px]">
				<header className="flex flex-col items-start gap-[10px]">
					<InquiryStatusMenu
						status={inquiry.status}
						onSelect={updateStatus}
						disabled={updating}
					/>
					<h1 className="text-[22px] leading-[26px] font-medium tracking-[1px] break-all text-brand-white">
						{inquiry.title}
					</h1>
					<CustomerInfoCard name={inquiry.name} email={inquiry.email} />
				</header>
				<ul aria-label="やり取り" className="flex flex-col gap-4">
					<MessageBubble
						from="customer"
						body={inquiry.body}
						imageUrl={inquiry.img_url}
					/>
					{replies.map((reply) => (
						<MessageBubble
							key={reply.id}
							from="admin"
							body={reply.body}
							imageUrl={reply.img_url}
							caption={reply.admin_name}
							footer={
								<ReplyMailNote
									reply={reply}
									hasAddress={Boolean(inquiry.email)}
									onResend={resendMail}
									resending={resendingId === reply.id}
								/>
							}
						/>
					))}
				</ul>
			</main>
			<ReplyComposer
				inquiryId={inquiry.id}
				inquiryTitle={inquiry.title}
				onSent={load}
				onResolve={() => setConfirmOpen(true)}
				resolved={inquiry.status === "resolved"}
			/>
			<ConfirmDialog
				open={confirmOpen}
				message={`${INQUIRY_STATUS_LABELS.resolved}に変更しますか？`}
				onConfirm={() => updateStatus("resolved")}
				onCancel={closeConfirm}
				pending={updating}
			/>
		</>
	);
}
