import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { TrialApplicationDetail } from "@/components/admin/trial-applications/TrialApplicationDetail";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "体験申し込み詳細 | 西尾ブレイズ 管理画面",
};

/** 体験申し込みの詳細（Figma なし。一覧の各行から開く） */
export default async function AdminTrialApplicationDetailPage({
	params,
}: PageProps<"/admin/trial-applications/[id]">) {
	const { id } = await params;
	return (
		<AdminPageLayout
			title="体験申し込み詳細"
			backHref={adminRoutes.trialApplications}
		>
			<TrialApplicationDetail id={id} />
		</AdminPageLayout>
	);
}
