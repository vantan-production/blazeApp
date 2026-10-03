import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/admin/routes";
import { getCurrentUser } from "@/lib/auth";

/**
 * ログインが必要な管理画面のレイアウト。
 * lib/auth.ts の requireAuth は公開サイト用の /login に飛ばすため、ここでは getCurrentUser を直接使い
 * 未ログインなら管理画面のログイン画面へリダイレクトする。
 */
export default async function ProtectedAdminLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const user = await getCurrentUser();
	if (!user) {
		redirect(adminRoutes.login);
	}
	return children;
}
