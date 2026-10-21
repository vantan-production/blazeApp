"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { AdminButton } from "@/components/admin/AdminButton";
import { accountRequest } from "@/lib/admin/account";
import { toErrorMessage } from "@/lib/admin/api";
import { adminRoutes } from "@/lib/admin/routes";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";

/** ログアウトボタン（POST /api/admin/logout）。確認してからログアウトし、ログイン画面へ移動する */
export function LogoutButton() {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);

	const goToLogin = () => {
		router.replace(adminRoutes.login);
		router.refresh();
	};

	const logout = async () => {
		setPending(true);
		try {
			await accountRequest("/api/admin/logout", {
				method: "POST",
				redirectOnUnauthorized: false,
			});
			showToast("ログアウトしました。");
			goToLogin();
		} catch (err) {
			// すでにログインが切れている（401）ならログアウト済みと同じなので、そのままログイン画面へ
			if (err instanceof ApiError && err.status === 401) {
				goToLogin();
				return;
			}
			showToast(toErrorMessage(err, "ログアウトに失敗しました。"), "error");
			setPending(false);
			setOpen(false);
		}
	};

	const close = useCallback(() => setOpen(false), []);

	return (
		<>
			<AdminButton variant="light" size="sm" onClick={() => setOpen(true)}>
				ログアウト
			</AdminButton>
			<AdminActionDialog
				open={open}
				title="ログアウトしますか？"
				description="もう一度使うときは、メールアドレスとパスワードでログインしてください。"
				confirmLabel="ログアウト"
				pending={pending}
				onConfirm={logout}
				onCancel={close}
			/>
		</>
	);
}
