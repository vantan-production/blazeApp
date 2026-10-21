import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import { LoginForm } from "@/components/admin/login/LoginForm";
import { adminRoutes, homePathForRole } from "@/lib/admin/routes";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
	title: "ログイン | 西尾ブレイズ 管理画面",
};

/** 管理画面ログイン（Figma: login 1700:3176） */
export default async function AdminLoginPage() {
	// ログイン済みならロールに合った行き先へ（back に繋がらない場合はそのままフォームを出す）
	const user = await getCurrentUser().catch(() => null);
	if (user) redirect(homePathForRole(user.role));

	return (
		<AdminAuthCard>
			<LoginForm />
			<Link
				href={adminRoutes.forgotPassword}
				className="mt-3 text-[12px] leading-[20px] tracking-[0.5px] text-brand-blue underline transition-opacity hover:opacity-80"
			>
				パスワードを忘れた方
			</Link>
		</AdminAuthCard>
	);
}
