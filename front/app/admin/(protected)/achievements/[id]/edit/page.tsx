import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AchievementEdit } from "@/components/admin/achievements/AchievementEdit";
import { adminAchievementDetailPath } from "@/lib/admin/routes";

export const metadata = {
	title: "実績編集 | 西尾ブレイズ 管理画面",
};

/** 実績の編集（PATCH /api/achievement/:id。詳細画面の「編集する」から開く） */
export default async function AdminAchievementEditPage({
	params,
}: PageProps<"/admin/achievements/[id]/edit">) {
	const { id } = await params;
	return (
		<AdminPageLayout title="実績編集" backHref={adminAchievementDetailPath(id)}>
			<AchievementEdit id={id} />
		</AdminPageLayout>
	);
}
