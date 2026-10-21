"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import { accountRequest } from "@/lib/admin/account";
import { toErrorMessage } from "@/lib/admin/api";
import { adminRoutes } from "@/lib/admin/routes";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";

type Props = {
	/** ログイン中のユーザーが owner か（owner が1人だけだと削除できない旨を添える） */
	isOwner: boolean;
};

/**
 * 自分のアカウントの削除（DELETE /api/admin/account-delete）。
 * back はすぐに消さず削除済みの印を付けるだけで（ソフトデリート）、30日以内ならログイン画面から元に戻せる。
 * 30日を過ぎると定期処理で完全に削除される（back/src/app.ts の cleanupExpiredAccounts）。
 * 本人確認のためパスワードを入力させ、danger の確認ダイアログを出してから削除する
 */
export function AccountDeleteSection({ isOwner }: Props) {
	const headingId = useId();
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const [password, setPassword] = useState("");
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);

	const deleteAccount = async () => {
		setPending(true);
		setSubmitError(null);
		try {
			await accountRequest("/api/admin/account-delete", {
				method: "DELETE",
				payload: { password },
				// 401 は「パスワードが正しくありません。」なので、ログイン画面へは飛ばさない
				redirectOnUnauthorized: false,
			});
			showToast("アカウントを削除しました。");
			router.replace(adminRoutes.login);
			router.refresh();
		} catch (err) {
			const message = toErrorMessage(err, "アカウントの削除に失敗しました。");
			// パスワード違い（401）は入力欄の下に、それ以外（owner が1人だけ など）はボタンの下に出す
			if (err instanceof ApiError && err.status === 401) {
				setPasswordError(message);
			} else {
				setSubmitError(message);
			}
			setPending(false);
			setOpen(false);
		}
	};

	const close = useCallback(() => setOpen(false), []);

	return (
		<section
			aria-labelledby={headingId}
			className="flex w-full flex-col gap-3 text-brand-white"
		>
			<h2
				id={headingId}
				className="text-[18px] leading-[26px] font-medium tracking-[1px]"
			>
				アカウントの削除
			</h2>
			<div className="flex flex-col gap-2 text-[13px] leading-[20px] tracking-[0.5px] opacity-90">
				<p>
					削除すると、すぐにログアウトされ、このアカウントでは管理画面に入れなくなります。
				</p>
				<p>
					削除した日から30日以内なら、ログイン画面から同じメールアドレスとパスワードで元に戻せます。30日を過ぎるとアカウントは完全に消え、元に戻せません。
				</p>
				{isOwner && (
					<p>
						オーナーがあなた1人だけのときは削除できません。先にほかの人をオーナーにしてください。
					</p>
				)}
			</div>
			<AdminTextField
				tone="dark"
				label="確認のため、いまのパスワードを入力してください"
				type="password"
				autoComplete="current-password"
				placeholder="パスワード"
				value={password}
				onChange={(event) => {
					setPassword(event.target.value);
					setPasswordError(null);
					setSubmitError(null);
				}}
				error={passwordError ?? undefined}
			/>
			<button
				type="button"
				onClick={() => setOpen(true)}
				disabled={password === ""}
				className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#d93036] text-[16px] leading-[22px] font-medium tracking-[1px] text-white shadow-[0px_4px_4px_rgba(0,0,0,0.15),0px_1px_1.5px_rgba(0,0,0,0.3)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
			>
				アカウントを削除する
			</button>
			{submitError && <AdminFieldError message={submitError} tone="dark" />}
			<AdminActionDialog
				open={open}
				title="アカウントを削除しますか？"
				description="すぐにログアウトされます。30日以内ならログイン画面から元に戻せますが、30日を過ぎると完全に削除されます。"
				confirmLabel="削除する"
				tone="danger"
				pending={pending}
				onConfirm={deleteAccount}
				onCancel={close}
			/>
		</section>
	);
}
