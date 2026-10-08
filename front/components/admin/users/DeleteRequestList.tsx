"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { toErrorMessage } from "@/lib/admin/api";
import {
	type AdminUser,
	type DeleteRequest,
	formatDateTime,
	requestAdminJson,
	toUserNameMap,
} from "@/lib/admin/users";
import { useToastStore } from "@/lib/store/useToastStore";
import { UsersPillButton } from "./UsersPageLayout";

type Props = {
	/** ログイン中の owner の id（自分が出した依頼は「取り消す」、他の人の依頼は「却下」と表示する） */
	currentUserId: string;
};

type PendingAction = {
	request: DeleteRequest;
	type: "approve" | "cancel";
};

/**
 * アカウント削除依頼の一覧と承認・取り消し（owner 専用）。
 * GET /api/admin/delete-requests, POST /api/admin/delete-requests/:requestId/approve,
 * DELETE /api/admin/delete-requests/:requestId。
 * 依頼には user id しか載らないため、名前は GET /api/admin/users から引く
 */
export function DeleteRequestList({ currentUserId }: Props) {
	const showToast = useToastStore((state) => state.showToast);
	const [requests, setRequests] = useState<DeleteRequest[]>([]);
	const [userNames, setUserNames] = useState<Map<string, string>>(new Map());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [action, setAction] = useState<PendingAction | null>(null);
	const [handling, setHandling] = useState(false);

	// 依頼とユーザーをまとめて取り直す。setState は取得後のコールバックの中だけで行う
	const fetchAll = useCallback(
		(isCurrent: () => boolean = () => true) =>
			Promise.all([
				requestAdminJson<DeleteRequest[]>("/api/admin/delete-requests"),
				requestAdminJson<AdminUser[]>("/api/admin/users"),
			])
				.then(([requestRes, userRes]) => {
					if (!isCurrent()) return;
					// 新しい依頼を上に出す
					setRequests(
						[...requestRes.data].sort((a, b) =>
							b.created_at.localeCompare(a.created_at),
						),
					);
					setUserNames(toUserNameMap(userRes.data));
					setError(null);
				})
				.catch((err) => {
					if (isCurrent())
						setError(toErrorMessage(err, "削除依頼の取得に失敗しました。"));
				})
				.finally(() => {
					if (isCurrent()) setLoading(false);
				}),
		[],
	);

	useEffect(() => {
		let current = true;
		fetchAll(() => current);
		return () => {
			current = false;
		};
	}, [fetchAll]);

	const handle = async () => {
		if (!action) return;
		setHandling(true);
		const { request, type } = action;
		try {
			if (type === "approve") {
				const res = await requestAdminJson(
					`/api/admin/delete-requests/${request.id}/approve`,
					"POST",
				);
				showToast(res.message ?? "承認しました。");
				// 最後の承認で削除が済むと依頼が消えるので、一覧を取り直す
				setLoading(true);
				fetchAll();
			} else {
				await requestAdminJson(
					`/api/admin/delete-requests/${request.id}`,
					"DELETE",
				);
				showToast(
					request.requested_by === currentUserId
						? "削除依頼を取り消しました。"
						: "削除依頼を却下しました。",
				);
				setRequests((prev) => prev.filter((r) => r.id !== request.id));
			}
		} catch (err) {
			// 承認済みの依頼をもう一度承認したとき（409「既に承認済みです。」）なども back の文言を出す
			showToast(
				toErrorMessage(
					err,
					type === "approve"
						? "承認できませんでした。"
						: "削除依頼を取り消せませんでした。",
				),
				"error",
			);
		} finally {
			setHandling(false);
			setAction(null);
		}
	};

	const closeAction = useCallback(() => setAction(null), []);

	const nameOf = (id: string) => userNames.get(id) ?? "（不明なユーザー）";

	return (
		<div className="flex w-full flex-col items-center gap-[30px]">
			{error && <p className="text-[14px]">{error}</p>}
			{!error && !loading && requests.length === 0 && (
				<p className="text-[14px]">承認待ちの削除依頼はありません。</p>
			)}
			{loading && <p className="text-[14px]">読み込み中…</p>}
			<ul className="flex w-full flex-col gap-[30px]">
				{requests.map((request) => {
					const isMine = request.requested_by === currentUserId;
					return (
						<li
							key={request.id}
							className="flex flex-col gap-1 after:mt-2 after:h-px after:w-full after:bg-white"
						>
							<p className="text-[16px] leading-[22px] font-medium tracking-[1px] break-all">
								{nameOf(request.target_user_id)}さんの削除
							</p>
							<p className="text-[12px] leading-[18px] tracking-[0.5px] opacity-80">
								依頼: {nameOf(request.requested_by)}
								{isMine && "（あなた）"}・{formatDateTime(request.created_at)}
							</p>
							<p className="text-[12px] leading-[18px] tracking-[0.5px] opacity-80">
								有効期限: {formatDateTime(request.expires_at)}
							</p>
							<div className="mt-2 flex flex-wrap gap-2">
								{/* 依頼した人は依頼時に承認済みなので、承認ボタンは出さない */}
								{!isMine && (
									<UsersPillButton
										onClick={() => setAction({ request, type: "approve" })}
									>
										承認する
									</UsersPillButton>
								)}
								<UsersPillButton
									tone="dark"
									onClick={() => setAction({ request, type: "cancel" })}
								>
									{isMine ? "依頼を取り消す" : "却下する"}
								</UsersPillButton>
							</div>
						</li>
					);
				})}
			</ul>
			<AdminActionDialog
				open={action !== null}
				{...(action?.type === "approve"
					? {
							title: `${nameOf(action.request.target_user_id)}さんの削除を承認しますか？`,
							description:
								"あなたの承認でオーナー全員の承認がそろうと、このアカウントはすぐに削除され、ログインできなくなります。",
							confirmLabel: "承認する",
							tone: "danger" as const,
						}
					: action?.request.requested_by === currentUserId
						? {
								title: "この削除依頼を取り消しますか？",
								description:
									"アカウントは削除されません。ほかのオーナーの承認もなくなります。",
								confirmLabel: "取り消す",
							}
						: {
								title: "この削除依頼を却下しますか？",
								description:
									"依頼はなくなり、アカウントは削除されません。ほかのオーナーの承認もなくなります。",
								confirmLabel: "却下する",
							})}
				onConfirm={handle}
				onCancel={closeAction}
				pending={handling}
			/>
		</div>
	);
}
