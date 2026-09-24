import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/admin/routes";
import { getCurrentUser } from "@/lib/auth";

/**
 * ログインが必要な管理画面のレイアウト。
 * lib/auth.ts の requireAuth は公開サイト用の /login に飛ばすため、ここでは getCurrentUser を直接使い
 * 未ログインなら管理画面の入口（ログイン/新規登録）へリダイレクトする。
 */
export default async function ProtectedAdminLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const user = await getCurrentUser();
	if (!user) {
		redirect(adminRoutes.welcome);
	}
	return children;
}
