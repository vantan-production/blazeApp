import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import { AccountRecoverForm } from "@/components/admin/login/AccountRecoverForm";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "アカウントを元に戻す | 西尾ブレイズ 管理画面",
};

/** 削除から30日以内のアカウントの復旧（ログインしていなくても開ける。ログイン時の「削除済み」から案内する） */
export default function AdminAccountRecoverPage() {
	return (
		<AdminAuthCard backHref={adminRoutes.login}>
			<AccountRecoverForm />
		</AdminAuthCard>
	);
}
