"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { AdminButton } from "@/components/admin/AdminButton";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import type { ApiSuccess } from "@/lib/admin/api";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import { adminRoutes } from "@/lib/admin/routes";
import { ApiError, apiClient } from "@/lib/apiClient";
import { emailSchema, passwordSchema } from "@/lib/validation/schemas";

const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
});

type LoginValues = z.input<typeof loginSchema>;

// apiClient はレスポンスボディを捨てるため、back の返す文言をステータスごとに対応させる（back/src/admin/login.ts）
const loginErrorMessage = (error: unknown) => {
	if (error instanceof ApiError) {
		if (error.status === 401)
			return "メールアドレスまたはパスワードが正しくありません。";
		if (error.status === 403) return "このアカウントは削除済みです。";
		if (error.status === 429)
			return "ログイン試行回数の上限に達しました、1分後に再試行してください。";
	}
	return "ログインに失敗しました。時間をおいて再度お試しください。";
};

/** メールアドレス・パスワードでのログインフォーム（Figma: login 1700:3176） */
export function LoginForm() {
	const router = useRouter();
	const [values, setValues] = useState<LoginValues>({
		email: "",
		password: "",
	});
	const [errors, setErrors] = useState<FieldErrors<LoginValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	const handleChange =
		(key: keyof LoginValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
			setValues((prev) => ({ ...prev, [key]: event.target.value }));

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const result = validateForm(loginSchema, values);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setErrors({});

		setPending(true);
		try {
			// JWT は HttpOnly Cookie で返るため、ボディのトークンは扱わない
			await apiClient<ApiSuccess<{ name: string; email: string }>>(
				"/api/admin/login",
				{
					method: "POST",
					body: JSON.stringify(result.data),
					skipAuthRedirect: true,
				},
			);
			router.replace(adminRoutes.top);
			router.refresh();
		} catch (error) {
			setSubmitError(loginErrorMessage(error));
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
			<AdminButton type="submit" disabled={pending}>
				{pending ? "ログイン中…" : "ログイン"}
			</AdminButton>
		</form>
	);
}
