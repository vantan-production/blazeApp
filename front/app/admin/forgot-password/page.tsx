import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import { ForgotPasswordForm } from "@/components/admin/login/ForgotPasswordForm";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "パスワードの再設定 | 西尾ブレイズ 管理画面",
};

/** パスワードを忘れたときの再設定メール送信（ログインしていなくても開ける） */
export default function AdminForgotPasswordPage() {
	return (
		<AdminAuthCard backHref={adminRoutes.login}>
			<ForgotPasswordForm />
		</AdminAuthCard>
	);
}
