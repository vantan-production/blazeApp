/**
 * ログインが必要な管理画面のレイアウト。
 * 本来は getCurrentUser（lib/auth.ts）で未ログインを判定し、管理画面の入口（ログイン/新規登録）へリダイレクトする。
 *
 * TODO: 確認のため当面はログインなしでも管理画面を表示する。公開前に getCurrentUser でのリダイレクトを戻す
 *   元のコード:
 *     const user = await getCurrentUser();
 *     if (!user) {
 *       redirect(adminRoutes.welcome);
 *     }
 */
export default function ProtectedAdminLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return children;
}
