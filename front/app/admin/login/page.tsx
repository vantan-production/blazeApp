import { redirect } from "next/navigation";
import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import { LoginForm } from "@/components/admin/login/LoginForm";
import { adminRoutes } from "@/lib/admin/routes";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
	title: "ログイン | 西尾ブレイズ 管理画面",
};

/** 管理画面ログイン（Figma: login 1700:3176） */
export default async function AdminLoginPage() {
	// ログイン済みならTOPへ（back に繋がらない場合はそのままフォームを出す）
	const user = await getCurrentUser().catch(() => null);
	if (user) redirect(adminRoutes.top);

	return (
		<AdminAuthCard>
			<LoginForm />
		</AdminAuthCard>
	);
}
