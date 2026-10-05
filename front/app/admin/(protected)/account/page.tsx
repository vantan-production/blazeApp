import { redirect } from "next/navigation";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AccountDeleteSection } from "@/components/admin/account/AccountDeleteSection";
import { AccountProfileCard } from "@/components/admin/account/AccountProfileCard";
import { LogoutButton } from "@/components/admin/account/LogoutButton";
import { NotificationSettingsCard } from "@/components/admin/account/NotificationSettingsCard";
import { adminRoutes } from "@/lib/admin/routes";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
	title: "アカウント | 西尾ブレイズ 管理画面",
};

/** 自分のアカウント（プロフィールの確認・ログアウト・メール通知の設定・アカウントの削除） */
export default async function AdminAccountPage() {
	// (protected)/layout.tsx で未ログインは弾いているが、型のためにここでも確かめる
	const user = await getCurrentUser();
	if (!user) redirect(adminRoutes.login);

	return (
		<AdminPageLayout title="アカウント">
			<div className="-mt-12 flex w-full flex-col gap-10">
				<section
					aria-label="ログイン中のアカウント"
					className="flex flex-col gap-3"
				>
					<AccountProfileCard user={user} />
					<LogoutButton />
				</section>
				<NotificationSettingsCard />
				<div aria-hidden className="h-px w-full bg-brand-white/40" />
				<AccountDeleteSection isOwner={user.role === "owner"} />
			</div>
		</AdminPageLayout>
	);
}
