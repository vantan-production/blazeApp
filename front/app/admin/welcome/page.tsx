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
			<div className="mt-6 flex flex-col items-center gap-2 text-center">
				<h1 className="text-[22px] leading-[22px] font-medium tracking-[1px] text-black">
					管理画面
				</h1>
				<span
					aria-hidden
					className="mt-1 h-[3px] w-10 rounded-full bg-brand-red"
				/>
				<p className="mt-3 text-[13px] leading-[20px] text-black/60">
					ニュースやお知らせの投稿・管理を行います。
				</p>
			</div>
			<nav
				aria-label="ログイン・新規登録"
				className="mt-8 flex w-full max-w-[240px] flex-col gap-4"
			>
				<AdminButtonLink href={adminRoutes.login}>ログイン</AdminButtonLink>
				<AdminButtonLink href={adminRoutes.register} variant="outline">
					新規登録
				</AdminButtonLink>
			</nav>
			<p className="mt-4 text-[12px] leading-[18px] text-black/50">
				新規登録には管理者からの招待が必要です
			</p>
		</AdminAuthCard>
	);
}
