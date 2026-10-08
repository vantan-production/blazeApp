"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { AdminButton } from "@/components/admin/AdminButton";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import { fetchHomePath } from "@/lib/admin/account";
import type { ApiSuccess } from "@/lib/admin/api";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import { ApiError, apiClient } from "@/lib/apiClient";
import {
	adminNameSchema,
	emailSchema,
	passwordSchema,
} from "@/lib/validation/schemas";

const registerSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
		passwordConfirmation: z.string(),
		name: adminNameSchema,
	})
	.refine((data) => data.password === data.passwordConfirmation, {
		path: ["passwordConfirmation"],
		message: "パスワードが一致しません。",
	});

type RegisterValues = z.input<typeof registerSchema>;

// apiClient はレスポンスボディを捨てるため、back の返す文言をステータスごとに対応させる（back/src/admin/register.ts）
const registerErrorMessage = (error: unknown) => {
	if (error instanceof ApiError) {
		if (error.status === 400)
			return "登録できませんでした。招待リンクが無効・期限切れか、パスワードが簡単すぎる可能性があります。";
		if (error.status === 409)
			return "このメールアドレスは既に登録されています。";
		if (error.status === 429)
			return "1分間に1回しか送信できません。時間をおいて再度お試しください。";
	}
	return "登録に失敗しました。時間をおいて再度お試しください。";
};

/** GET /api/admin/invitations/verify が返す招待内容（back/src/admin/invitations.ts） */
export type Invitation = {
	email: string;
	role: "admin" | "member";
};

type Props = {
	/** 招待メールのリンクに付いている招待トークン（?token=...）。確認が取れたものだけ渡す */
	invitationToken: string | null;
	/** 確認済みの招待内容。メール欄の初期値に使う */
	invitation?: Invitation | null;
	/** 招待リンクが無効・期限切れのときに出す文言 */
	invitationError?: string | null;
};

/** 招待リンクからの新規登録フォーム（Figma: login 2424:984） */
export function RegisterForm({
	invitationToken,
	invitation = null,
	invitationError = null,
}: Props) {
	const router = useRouter();
	const [values, setValues] = useState<RegisterValues>({
		// back は招待先と同じアドレスでしか登録させないため、招待のアドレスを入れておく
		email: invitation?.email ?? "",
		password: "",
		passwordConfirmation: "",
		name: "",
	});
	const [errors, setErrors] = useState<FieldErrors<RegisterValues>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	const handleChange =
		(key: keyof RegisterValues) =>
		(event: React.ChangeEvent<HTMLInputElement>) =>
			setValues((prev) => ({ ...prev, [key]: event.target.value }));

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError(null);

		const result = validateForm(registerSchema, values);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		setErrors({});

		setPending(true);
		try {
			await apiClient<ApiSuccess<{ name: string; email: string }>>(
				"/api/admin/register",
				{
					method: "POST",
					body: JSON.stringify({ ...result.data, token: invitationToken }),
					skipAuthRedirect: true,
				},
			);
			// 登録成功時はログイン済みの Cookie が発行される
			// member は関係者ページ、admin / owner は管理画面TOPへ
			router.replace(await fetchHomePath());
			router.refresh();
		} catch (error) {
			setSubmitError(registerErrorMessage(error));
			setPending(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			noValidate
			className="flex w-full flex-col items-center gap-[19px]"
		>
			{!invitationToken && (
				<AdminFieldError
					message={
						invitationError ??
						"新規登録は招待メールのリンクから行ってください。"
					}
				/>
			)}
			<div className="flex w-full flex-col gap-2 py-[10px]">
				<AdminTextField
					label="メールアドレス"
					type="email"
					autoComplete="email"
					placeholder="メールアドレス"
					value={values.email}
					onChange={handleChange("email")}
					// 招待先以外のアドレスでは登録できないため、招待が確認できたら変更させない
					readOnly={invitation !== null}
					error={errors.email}
				/>
				<AdminTextField
					label="パスワード"
					type="password"
					autoComplete="new-password"
					placeholder="パスワード"
					value={values.password}
					onChange={handleChange("password")}
					error={errors.password}
				/>
				<AdminTextField
					label="パスワードの確認"
					type="password"
					autoComplete="new-password"
					placeholder="パスワード"
					value={values.passwordConfirmation}
					onChange={handleChange("passwordConfirmation")}
					error={errors.passwordConfirmation}
				/>
				<AdminTextField
					label="ユーザーネーム"
					autoComplete="name"
					placeholder="ユーザーネーム"
					value={values.name}
					onChange={handleChange("name")}
					error={errors.name}
				/>
			</div>
			{submitError && <AdminFieldError message={submitError} />}
			<AdminButton type="submit" disabled={pending || !invitationToken}>
				{pending ? "登録中…" : "新規登録"}
			</AdminButton>
		</form>
	);
}
