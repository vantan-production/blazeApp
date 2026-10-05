import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import { ResetPasswordForm } from "@/components/admin/login/ResetPasswordForm";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "新しいパスワードの設定 | 西尾ブレイズ 管理画面",
};

/**
 * 新しいパスワードの設定。back が送る再設定メールのリンク
 * （back/src/utils/mail.ts の buildPasswordResetEmail: /admin/reset-password?token=...）から開く
 */
export default async function AdminResetPasswordPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { token } = await searchParams;

	return (
		<AdminAuthCard backHref={adminRoutes.login}>
			<ResetPasswordForm token={typeof token === "string" ? token : null} />
		</AdminAuthCard>
	);
}
