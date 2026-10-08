"use client";

import { useState } from "react";
import { z } from "zod";
import { AdminButton, AdminButtonLink } from "@/components/admin/AdminButton";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import { accountRequest } from "@/lib/admin/account";
import { toErrorMessage } from "@/lib/admin/api";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import { adminRoutes } from "@/lib/admin/routes";
import { ApiError } from "@/lib/apiClient";
import { passwordSchema } from "@/lib/validation/schemas";

const resetSchema = z
	.object({
		password: passwordSchema,
		passwordConfirmation: z.string(),
	})
	.refine((data) => data.password === data.passwordConfirmation, {
		path: ["passwordConfirmation"],
		message: "パスワードが一致しません。",
	});

type ResetValues = z.input<typeof resetSchema>;

type Props = {
	/** パスワード再設定メールのリンクに付いているトークン（?token=...） */
	token: string | null;
};

/**
 * 再設定メールのリンクから開く、新しいパスワードの設定フォーム（POST /api/admin/reset-password）。
 * 成功するとそれまでのログインは無効になるため、ログイン画面へ案内する
 */
export function ResetPasswordForm({ token }: Props) {
	const [values, setValues] = useState<ResetValues>({
		password: "",
		passwordConfirmation: "",
	});
	const [errors, setErrors] = useState<FieldErrors<ResetValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [done, setDone] = useState(false);

	const handleChange =
		(key: keyof ResetValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
			setValues((prev) => ({ ...prev, [key]: event.target.value }));

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const result = validateForm(resetSchema, values);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setErrors({});

		setPending(true);
		try {
			await accountRequest("/api/admin/reset-password", {
				method: "POST",
				payload: { ...result.data, token },
				redirectOnUnauthorized: false,
			});
			setDone(true);
		} catch (error) {
			// 「パスワードが簡単です。」「無効または期限切れのトークンです…」は back の文言をそのまま出す
			setSubmitError(
				error instanceof ApiError && error.status === 429
					? "試行回数の上限に達しました。1分後に再試行してください。"
					: toErrorMessage(
							error,
							"再設定に失敗しました。時間をおいて再度お試しください。",
						),
			);
		} finally {
			setPending(false);
		}
	};

	if (done) {
		return (
			<div className="flex w-full flex-col items-center gap-[19px] pt-[10px]">
				<p className="w-full text-center text-[14px] leading-[22px] tracking-[0.5px] text-brand-black">
					パスワードを再設定しました。
					<br />
					新しいパスワードでログインしてください。
				</p>
				<AdminButtonLink href={adminRoutes.login}>
					ログイン画面へ
				</AdminButtonLink>
			</div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className="flex w-full flex-col items-center gap-[19px]"
		>
			<div className="flex w-full flex-col gap-2 py-[10px]">
				<h1 className="text-center text-[18px] leading-[26px] font-medium tracking-[1px] text-brand-black">
					新しいパスワードの設定
				</h1>
				{token ? (
					<p className="text-[12px] leading-[20px] tracking-[0.5px] text-[#505050]">
						新しいパスワードを2回入力してください。名前やメールアドレスに似たものなど、推測されやすいパスワードは使えません。
					</p>
				) : (
					<AdminFieldError message="このページはパスワード再設定メールのリンクから開いてください。" />
				)}
				<AdminTextField
					label="新しいパスワード"
					type="password"
					autoComplete="new-password"
					placeholder="パスワード"
					value={values.password}
					onChange={handleChange("password")}
					error={errors.password}
				/>
				<AdminTextField
					label="新しいパスワードの確認"
					type="password"
					autoComplete="new-password"
					placeholder="パスワード"
					value={values.passwordConfirmation}
					onChange={handleChange("passwordConfirmation")}
					error={errors.passwordConfirmation}
				/>
			</div>
			{submitError && <AdminFieldError message={submitError} />}
			<AdminButton
				type="submit"
				disabled={
					pending ||
					!token ||
					values.password === "" ||
					values.passwordConfirmation === ""
				}
			>
				{pending ? "設定中…" : "パスワードを設定"}
			</AdminButton>
		</form>
	);
}
