import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminToaster } from "@/components/admin/AdminToaster";
import { adminRoutes } from "@/lib/admin/routes";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
	title: "関係者ページ | 西尾ブレイズ",
	// 関係者ページは検索エンジンに載せない
	robots: { index: false, follow: false },
};

/**
 * 関係者ページ（member 以上・SPのみ）の共通枠。見た目は管理画面と同じく、スマホ幅（最大430px）で中央寄せにする。
 * ログイン必須。未ログインなら管理画面と共通のログイン画面へリダイレクトする。
 * owner / admin も開ける（各 API が member 以上を許可している）
 */
export default async function MembersLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const user = await getCurrentUser();
	if (!user) {
		redirect(adminRoutes.login);
	}
	return (
		<div className="mx-auto flex w-full max-w-sp flex-1 flex-col bg-brand-blue">
			{children}
			<AdminToaster />
		</div>
	);
}
