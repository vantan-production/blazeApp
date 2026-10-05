"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { AdminButton } from "@/components/admin/AdminButton";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import { accountRequest } from "@/lib/admin/account";
import { toErrorMessage } from "@/lib/admin/api";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import { adminRoutes } from "@/lib/admin/routes";
import { ApiError } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";
import { emailSchema, passwordSchema } from "@/lib/validation/schemas";

const recoverSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
});

type RecoverValues = z.input<typeof recoverSchema>;

/**
 * 削除したアカウントを元に戻すフォーム（POST /api/admin/account-recover）。
 * 削除から30日以内なら、削除前のメールアドレス・パスワードで復旧でき、そのままログイン状態になる
 */
export function AccountRecoverForm() {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const [values, setValues] = useState<RecoverValues>({
		email: "",
		password: "",
	});
	const [errors, setErrors] = useState<FieldErrors<RecoverValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	const handleChange =
		(key: keyof RecoverValues) =>
		(event: React.ChangeEvent<HTMLInputElement>) =>
			setValues((prev) => ({ ...prev, [key]: event.target.value }));

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const result = validateForm(recoverSchema, values);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setErrors({});

		setPending(true);
		try {
			// 復旧に成功すると、ログインと同じく HttpOnly Cookie が発行される
			await accountRequest<{ name: string; email: string }>(
				"/api/admin/account-recover",
				{ method: "POST", payload: result.data, redirectOnUnauthorized: false },
			);
			showToast("アカウントを元に戻しました。");
			router.replace(adminRoutes.top);
			router.refresh();
		} catch (error) {
			// 401: メールアドレス・パスワード違い / 400: 削除されていない / 403: 30日を過ぎている（back の文言を出す）
			setSubmitError(
				error instanceof ApiError && error.status === 429
					? "試行回数の上限に達しました。1分後に再試行してください。"
					: toErrorMessage(
							error,
							"元に戻せませんでした。時間をおいて再度お試しください。",
						),
			);
			setPending(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className="flex w-full flex-col items-center gap-[19px]"
		>
			<div className="flex w-full flex-col gap-2 py-[10px]">
				<h1 className="text-center text-[18px] leading-[26px] font-medium tracking-[1px] text-brand-black">
					アカウントを元に戻す
				</h1>
				<p className="text-[12px] leading-[20px] tracking-[0.5px] text-[#505050]">
					削除したアカウントは、削除した日から30日以内なら元に戻せます。削除する前に使っていたメールアドレスとパスワードを入力してください。30日を過ぎたアカウントは完全に消えているため、元に戻せません。
				</p>
				<AdminTextField
					label="メールアドレス"
					type="email"
					autoComplete="email"
					placeholder="メールアドレス"
					value={values.email}
					onChange={handleChange("email")}
					error={errors.email}
				/>
				<AdminTextField
					label="パスワード"
					type="password"
					autoComplete="current-password"
					placeholder="パスワード"
					value={values.password}
					onChange={handleChange("password")}
					error={errors.password}
				/>
			</div>
			{submitError && <AdminFieldError message={submitError} />}
			<AdminButton
				type="submit"
				disabled={pending || values.email === "" || values.password === ""}
			>
				{pending ? "処理中…" : "元に戻す"}
			</AdminButton>
		</form>
	);
}
