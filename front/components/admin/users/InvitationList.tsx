"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { toErrorMessage } from "@/lib/admin/api";
import {
	ADMIN_ROLE_LABELS,
	type AdminUser,
	formatDateTime,
	INVITATION_STATUS_LABELS,
	type Invitation,
	type InvitationCreated,
	invitationMailFailedMessage,
	requestAdminJson,
	toUserNameMap,
} from "@/lib/admin/users";
import { useToastStore } from "@/lib/store/useToastStore";
import { InvitationForm } from "./InvitationForm";
import { UsersPillButton, UsersTag } from "./UsersPageLayout";

/** 一覧から行う操作（再送 or 取り消し・一覧から消す） */
type InvitationAction = "resend" | "revoke";

/**
 * 招待の発行・一覧・再送・取り消し（owner 専用）。
 * GET/POST /api/admin/invitations, POST /api/admin/invitations/:id/resend,
 * DELETE /api/admin/invitations/:id。
 * 発行者の名前は GET /api/admin/users から引く（取れなくても一覧は出す）
 */
export function InvitationList() {
	const showToast = useToastStore((state) => state.showToast);
	const [invitations, setInvitations] = useState<Invitation[]>([]);
	const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [target, setTarget] = useState<{
		invitation: Invitation;
		action: InvitationAction;
	} | null>(null);
	const [submitting, setSubmitting] = useState(false);

	// setState は取得後のコールバックの中だけで行う（effect から同期的に呼ばない）
	const fetchInvitations = useCallback(
		(isCurrent: () => boolean = () => true) =>
			requestAdminJson<Invitation[]>("/api/admin/invitations")
				.then((res) => {
					if (!isCurrent()) return;
					setInvitations(res.data);
					setError(null);
				})
				.catch((err) => {
					if (isCurrent())
						setError(toErrorMessage(err, "招待の取得に失敗しました。"));
				})
				.finally(() => {
					if (isCurrent()) setLoading(false);
				}),
		[],
	);

	useEffect(() => {
		let current = true;
		fetchInvitations(() => current);
		// 発行者の名前の表示用。失敗しても名前を出さないだけにする
		requestAdminJson<AdminUser[]>("/api/admin/users")
			.then((res) => {
				if (current) setUserNames(toUserNameMap(res.data));
			})
			.catch(() => {});
		return () => {
			current = false;
		};
	}, [fetchInvitations]);

	const revoke = async (invitation: Invitation) => {
		try {
			await requestAdminJson(
				`/api/admin/invitations/${invitation.id}`,
				"DELETE",
			);
			showToast("招待を取り消しました。");
			setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
		} catch (err) {
			showToast(toErrorMessage(err, "招待を取り消せませんでした。"), "error");
		}
	};

	// 再送すると back で新しい招待に置き換わる（id・有効期限が変わる）ので一覧を読み直す。
	// メールだけ送れなかったときも、古いリンクは失効済みなので読み直す
	const resend = async (invitation: Invitation) => {
		try {
			const res = await requestAdminJson<InvitationCreated>(
				`/api/admin/invitations/${invitation.id}/resend`,
				"POST",
			);
			if (res.data.mail_sent) {
				showToast(`${invitation.email} に招待メールを再送しました。`);
			} else {
				showToast(invitationMailFailedMessage(invitation.email), "error");
			}
			fetchInvitations();
		} catch (err) {
			showToast(
				toErrorMessage(err, "招待メールを再送できませんでした。"),
				"error",
			);
		}
	};

	const confirm = async () => {
		if (!target) return;
		setSubmitting(true);
		if (target.action === "resend") {
			await resend(target.invitation);
		} else {
			await revoke(target.invitation);
		}
		setSubmitting(false);
		setTarget(null);
	};

	const closeDialog = useCallback(() => setTarget(null), []);

	return (
		<div className="flex w-full flex-col items-center gap-[30px]">
			<InvitationForm onCreated={() => fetchInvitations()} />
			<h2 className="self-start text-[16px] leading-[22px] font-medium tracking-[1px]">
				これまでの招待
			</h2>
			{error && <p className="text-[14px]">{error}</p>}
			{!error && !loading && invitations.length === 0 && (
				<p className="text-[14px]">まだ招待はありません。</p>
			)}
			{loading && <p className="text-[14px]">読み込み中…</p>}
			<ul className="flex w-full flex-col gap-[30px]">
				{invitations.map((invitation) => {
					const inviter = userNames.get(invitation.invited_by);
					return (
						<li
							key={invitation.id}
							className="flex flex-col gap-1 after:mt-2 after:h-px after:w-full after:bg-white"
						>
							<div className="flex flex-wrap items-center gap-2">
								<UsersTag>
									{INVITATION_STATUS_LABELS[invitation.status]}
								</UsersTag>
								<span className="text-[12px] leading-[22px] tracking-[1px]">
									{ADMIN_ROLE_LABELS[invitation.role]}
								</span>
							</div>
							<p className="text-[14px] leading-[22px] tracking-[0.5px] break-all">
								{invitation.email}
							</p>
							<p className="text-[12px] leading-[18px] tracking-[0.5px] opacity-80">
								送信: {formatDateTime(invitation.created_at)}
								{inviter && `（${inviter}）`}
							</p>
							<p className="text-[12px] leading-[18px] tracking-[0.5px] opacity-80">
								{invitation.used_at
									? `登録: ${formatDateTime(invitation.used_at)}`
									: `有効期限: ${formatDateTime(invitation.expires_at)}`}
							</p>
							{/* 使用済みは登録の履歴として残すため、再送も取り消しもできない（back が 400 を返す） */}
							{invitation.status !== "used" && (
								<div className="mt-2 flex flex-wrap gap-2">
									<UsersPillButton
										tone="dark"
										onClick={() => setTarget({ invitation, action: "resend" })}
									>
										招待メールを再送する
									</UsersPillButton>
									<UsersPillButton
										tone="dark"
										onClick={() => setTarget({ invitation, action: "revoke" })}
									>
										{invitation.status === "pending"
											? "取り消す"
											: "一覧から消す"}
									</UsersPillButton>
								</div>
							)}
						</li>
					);
				})}
			</ul>
			<AdminActionDialog
				open={target !== null}
				{...dialogProps(target?.invitation, target?.action)}
				onConfirm={confirm}
				onCancel={closeDialog}
				pending={submitting}
			/>
		</div>
	);
}

/** 確認ダイアログの見出し・補足・ボタン（操作と招待の状態で出し分ける） */
function dialogProps(
	invitation: Invitation | undefined,
	action: InvitationAction | undefined,
) {
	if (action === "resend") {
		return {
			title: "招待メールを再送しますか？",
			description: `${invitation?.email ?? ""} に新しいリンクの招待メールを送ります。前に送ったリンクは使えなくなり、有効期限は今から7日になります。`,
			confirmLabel: "再送する",
			tone: "default" as const,
		};
	}
	if (invitation?.status === "pending") {
		return {
			title: "この招待を取り消しますか？",
			description: `${invitation.email} に送った招待メールのリンクが使えなくなります。もう一度招待するときは、新しく招待メールを送ってください。`,
			confirmLabel: "取り消す",
			tone: "danger" as const,
		};
	}
	return {
		title: "この招待を一覧から消しますか？",
		description:
			"有効期限が切れた招待です。消しても、もう一度招待メールを送ることはできます。",
		confirmLabel: "消す",
		tone: "danger" as const,
	};
}
