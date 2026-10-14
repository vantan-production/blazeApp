import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { TrialApplicationList } from "@/components/admin/trial-applications/TrialApplicationList";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "体験申し込み | 西尾ブレイズ 管理画面",
};

/** 体験申し込み一覧（Figma なし。問い合わせ一覧の見た目に合わせている） */
export default function AdminTrialApplicationsPage() {
	return (
		<AdminPageLayout title="体験申し込み" backHref={adminRoutes.top}>
			<TrialApplicationList />
		</AdminPageLayout>
	);
}
