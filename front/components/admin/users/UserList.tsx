"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { toErrorMessage } from "@/lib/admin/api";
import {
	ADMIN_ROLE_DESCRIPTIONS,
	ADMIN_ROLE_LABELS,
	ADMIN_ROLES,
	type AdminRole,
	type AdminUser,
	type DeleteRequestCreated,
	requestAdminJson,
} from "@/lib/admin/users";
import { useToastStore } from "@/lib/store/useToastStore";
import { UsersPillButton, UsersTag } from "./UsersPageLayout";

type Props = {
	/** ログイン中の owner の id（自分の行はロール変更・削除依頼を出さない） */
	currentUserId: string;
};

/** 確認ダイアログで確定待ちの操作 */
type PendingAction =
	| { type: "role"; user: AdminUser; role: AdminRole }
	| { type: "delete"; user: AdminUser };

/**
 * 管理画面ユーザーの一覧とロール変更・削除依頼（owner 専用）。
 * GET /api/admin/users, PATCH /api/admin/users/:userId/role, POST /api/admin/users/:userId/delete-request
 */
export function UserList({ currentUserId }: Props) {
	const showToast = useToastStore((state) => state.showToast);
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [action, setAction] = useState<PendingAction | null>(null);
	const [handling, setHandling] = useState(false);

	// setState は取得後のコールバックの中だけで行う（effect から同期的に呼ばない）
	const fetchUsers = useCallback(
		(isCurrent: () => boolean = () => true) =>
			requestAdminJson<AdminUser[]>("/api/admin/users")
				.then((res) => {
					if (!isCurrent()) return;
					setUsers(res.data);
					setError(null);
				})
				.catch((err) => {
					if (isCurrent())
						setError(toErrorMessage(err, "ユーザーの取得に失敗しました。"));
				})
				.finally(() => {
					if (isCurrent()) setLoading(false);
				}),
		[],
	);

	useEffect(() => {
		let current = true;
		fetchUsers(() => current);
		return () => {
			current = false;
		};
	}, [fetchUsers]);

	const changeRole = async (user: AdminUser, role: AdminRole) => {
		await requestAdminJson(`/api/admin/users/${user.id}/role`, "PATCH", {
			role,
		});
		showToast(
			`${user.name}さんを「${ADMIN_ROLE_LABELS[role]}」に変更しました。`,
		);
		setUsers((prev) =>
			prev.map((u) => (u.id === user.id ? { ...u, role } : u)),
		);
	};

	const requestDelete = async (user: AdminUser) => {
		const res = await requestAdminJson<DeleteRequestCreated | undefined>(
			`/api/admin/users/${user.id}/delete-request`,
			"POST",
		);
		// 他に owner がいないときは依頼を出した時点で削除まで済む（data が返らない）
		if (!res.data) {
			setUsers((prev) => prev.filter((u) => u.id !== user.id));
		}
		showToast(res.message ?? "削除依頼を出しました。");
	};

	const handle = async () => {
		if (!action) return;
		setHandling(true);
		try {
			if (action.type === "role") await changeRole(action.user, action.role);
			else await requestDelete(action.user);
		} catch (err) {
			showToast(
				toErrorMessage(
					err,
					action.type === "role"
						? "ロールの変更に失敗しました。"
						: "削除依頼を出せませんでした。",
				),
				"error",
			);
		} finally {
			setHandling(false);
			setAction(null);
		}
	};

	const closeAction = useCallback(() => setAction(null), []);

	return (
		<div className="flex w-full flex-col items-center gap-[30px]">
			{error && <p className="text-[14px]">{error}</p>}
			{!error && !loading && users.length === 0 && (
				<p className="text-[14px]">ユーザーがいません。</p>
			)}
			{loading && <p className="text-[14px]">読み込み中…</p>}
			<ul className="flex w-full flex-col gap-[30px]">
				{users.map((user) => (
					<UserRow
						key={user.id}
						user={user}
						isMe={user.id === currentUserId}
						onSelectRole={(role) => setAction({ type: "role", user, role })}
						onRequestDelete={() => setAction({ type: "delete", user })}
					/>
				))}
			</ul>
			<AdminActionDialog
				open={action !== null}
				{...(action?.type === "role"
					? {
							title: `${action.user.name}さんを「${ADMIN_ROLE_LABELS[action.role]}」に変更しますか？`,
							description: ADMIN_ROLE_DESCRIPTIONS[action.role],
							confirmLabel: "変更する",
						}
					: {
							title: `${action?.user.name ?? ""}さんのアカウントの削除を依頼しますか？`,
							description:
								"ほかのオーナー全員が「削除依頼」画面で承認すると、このアカウントは削除されてログインできなくなります。オーナーがあなた1人の場合は、すぐに削除されます。依頼は24時間で無効になります。",
							confirmLabel: "削除を依頼",
							tone: "danger" as const,
						})}
				onConfirm={handle}
				onCancel={closeAction}
				pending={handling}
			/>
		</div>
	);
}

type RowProps = {
	user: AdminUser;
	isMe: boolean;
	onSelectRole: (role: AdminRole) => void;
	onRequestDelete: () => void;
};

/** ユーザー一覧の1行（名前・メール・ロール。自分以外はロール変更と削除依頼ができる） */
function UserRow({ user, isMe, onSelectRole, onRequestDelete }: RowProps) {
	const selectId = useId();

	return (
		<li className="flex flex-col gap-2 after:mt-1 after:h-px after:w-full after:bg-white">
			<div className="flex flex-wrap items-center gap-2">
				<p className="text-[16px] leading-[22px] font-medium tracking-[1px] break-all">
					{user.name}
					{isMe && <span className="ml-1 text-[12px]">（あなた）</span>}
				</p>
				<UsersTag>{ADMIN_ROLE_LABELS[user.role]}</UsersTag>
			</div>
			<p className="text-[12px] leading-[18px] tracking-[0.5px] break-all opacity-90">
				{user.email}
			</p>
			{isMe ? (
				<p className="text-[12px] leading-[18px] opacity-80">
					自分のロールは変更できません。
				</p>
			) : (
				<div className="flex flex-wrap items-center gap-2">
					<label htmlFor={selectId} className="sr-only">
						{user.name}さんのロール
					</label>
					{/* 選んだ時点では変えず、確認ダイアログで「変更する」を押したときに送る。
					    value は常に今のロールなので、キャンセルすると元の表示に戻る */}
					<select
						id={selectId}
						value={user.role}
						onChange={(event) => onSelectRole(event.target.value as AdminRole)}
						className="h-8 rounded-full bg-brand-white px-3 text-[14px] leading-[22px] tracking-[1px] text-brand-blue shadow-[0px_2px_4px_rgba(0,0,0,0.25)]"
					>
						{ADMIN_ROLES.map((role) => (
							<option key={role} value={role}>
								{ADMIN_ROLE_LABELS[role]}
							</option>
						))}
					</select>
					{/* owner は削除依頼の対象にできない（back が 400 を返す）ので出さない */}
					{user.role !== "owner" && (
						<UsersPillButton tone="dark" onClick={onRequestDelete}>
							削除を依頼
						</UsersPillButton>
					)}
				</div>
			)}
		</li>
	);
}
