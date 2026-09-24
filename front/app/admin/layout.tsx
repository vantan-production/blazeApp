import type { Metadata } from "next";
import { AdminToaster } from "@/components/admin/AdminToaster";

export const metadata: Metadata = {
	title: "管理画面 | 西尾ブレイズ",
	// 管理画面は検索エンジンに載せない
	robots: { index: false, follow: false },
};

/** 管理画面（SPのみ）の共通枠。公開サイトのヘッダー・フッターは出さず、スマホ幅（最大430px）で中央寄せにする */
export default function AdminLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<div className="mx-auto flex w-full max-w-sp flex-1 flex-col bg-brand-blue">
			{children}
			<AdminToaster />
		</div>
	);
}
