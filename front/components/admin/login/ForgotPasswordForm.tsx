"use client";

import Link from "next/link";
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
import { emailSchema } from "@/lib/validation/schemas";

const forgotSchema = z.object({ email: emailSchema });

type ForgotValues = z.input<typeof forgotSchema>;

/**
 * パスワードを忘れたときの再設定メール送信フォーム（POST /api/admin/forgot-password）。
 * back は登録の有無に関わらず同じ文言を返すため、送信後はその文言をそのまま出す
 */
export function ForgotPasswordForm() {
	const [values, setValues] = useState<ForgotValues>({ email: "" });
	const [errors, setErrors] = useState<FieldErrors<ForgotValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	// 送信できたら back の案内文を入れる（フォームの代わりに表示する）
	const [sentMessage, setSentMessage] = useState<string | null>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const result = validateForm(forgotSchema, values);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setErrors({});

		setPending(true);
		try {
			const res = await accountRequest("/api/admin/forgot-password", {
				method: "POST",
				payload: result.data,
				redirectOnUnauthorized: false,
			});
			setSentMessage(
				res.message ??
					"ご入力のメールアドレスが登録されている場合、パスワード再設定用のメールを送信しました。",
			);
		} catch (error) {
			// レート制限（1分に3回）の応答は JSON ではないため、ステータスで文言を決める
			setSubmitError(
				error instanceof ApiError && error.status === 429
					? "送信回数の上限に達しました。1分後に再試行してください。"
					: toErrorMessage(
							error,
							"送信に失敗しました。時間をおいて再度お試しください。",
						),
			);
		} finally {
			setPending(false);
		}
	};

	if (sentMessage) {
		return (
			<div className="flex w-full flex-col items-center gap-[19px] pt-[10px]">
				<p className="w-full text-[14px] leading-[22px] tracking-[0.5px] text-brand-black">
					{sentMessage}
				</p>
				<p className="w-full text-[12px] leading-[20px] tracking-[0.5px] text-[#505050]">
					メールに書かれたリンクから、1時間以内に新しいパスワードを設定してください。メールが届かない場合は、迷惑メールフォルダもご確認ください。
				</p>
				<Link
					href={adminRoutes.login}
					className="text-[14px] leading-[22px] tracking-[1px] text-brand-blue underline transition-opacity hover:opacity-80"
				>
					ログイン画面へ戻る
				</Link>
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
					パスワードの再設定
				</h1>
				<p className="text-[12px] leading-[20px] tracking-[0.5px] text-[#505050]">
					登録しているメールアドレスを入力してください。パスワードを設定し直すためのリンクをメールでお送りします。
				</p>
				<AdminTextField
					label="メールアドレス"
					type="email"
					autoComplete="email"
					placeholder="メールアドレス"
					value={values.email}
					onChange={(event) => setValues({ email: event.target.value })}
					error={errors.email}
				/>
			</div>
			{submitError && <AdminFieldError message={submitError} />}
			<AdminButton
				type="submit"
				disabled={pending || values.email.trim() === ""}
			>
				{pending ? "送信中…" : "メールを送る"}
			</AdminButton>
		</form>
	);
}
