import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminAchievementDetail } from "@/components/admin/achievements/AdminAchievementDetail";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "実績詳細 | 西尾ブレイズ 管理画面",
};

/** 投稿済み実績の詳細（デザイン未作成。一覧の各行から開く） */
export default async function AdminAchievementDetailPage({
	params,
}: PageProps<"/admin/achievements/[id]">) {
	const { id } = await params;
	return (
		<AdminPageLayout title="実績詳細" backHref={adminRoutes.achievements}>
			<AdminAchievementDetail id={id} />
		</AdminPageLayout>
	);
}
