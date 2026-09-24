import { redirect } from "next/navigation";
import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import { AdminButtonLink } from "@/components/admin/AdminButton";
import { adminRoutes } from "@/lib/admin/routes";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
	title: "ログイン・新規登録 | 西尾ブレイズ 管理画面",
};

/** 管理画面の入口。ログインか新規登録かを選ぶ（Figma: ログイン 1836:968） */
export default async function AdminWelcomePage() {
	// ログイン済みならTOPへ（back に繋がらない場合はそのままフォームを出す）
	const user = await getCurrentUser().catch(() => null);
	if (user) redirect(adminRoutes.top);

	return (
		<AdminAuthCard>
			<nav
				aria-label="ログイン・新規登録"
				className="mt-[76px] mb-[29px] flex w-[131px] flex-col gap-[30px]"
			>
				<AdminButtonLink href={adminRoutes.login} size="sm">
					ログイン
				</AdminButtonLink>
				<AdminButtonLink
					href={adminRoutes.register}
					variant="outline"
					size="sm"
				>
					新規登録
				</AdminButtonLink>
			</nav>
		</AdminAuthCard>
	);
}
