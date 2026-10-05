import { redirect } from "next/navigation";
import { adminRoutes, membersTopPath } from "@/lib/admin/routes";
import { getCurrentUser } from "@/lib/auth";

/**
 * ログインが必要な管理画面のレイアウト。
 * lib/auth.ts の requireAuth は公開サイト用の /login に飛ばすため、ここでは getCurrentUser を直接使い
 * 未ログインなら管理画面のログイン画面へ、member なら関係者ページへリダイレクトする。
 */
export default async function ProtectedAdminLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const user = await getCurrentUser();
	if (!user) {
		redirect(adminRoutes.login);
	}
	// member は管理用の API を使えない（403）ため、関係者ページへ移す
	if (user.role === "member") {
		redirect(membersTopPath);
	}
	return children;
}
