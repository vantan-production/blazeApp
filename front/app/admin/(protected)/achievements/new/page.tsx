import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AchievementPostForm } from "@/components/admin/achievements/AchievementPostForm";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "実績を投稿 | 西尾ブレイズ 管理画面",
};

/** 実績の新規投稿（Figma: achievements 2034:1621） */
export default function AdminAchievementsNewPage() {
	return (
		<AdminPageLayout title="実績作成" backHref={adminRoutes.achievements}>
			{/* TODO: 画像・動画・ファイルを同時に添付できるようにするか要検討（API は各1つずつ受け取れるが、デザインの枠は1つ） */}
			<AchievementPostForm />
		</AdminPageLayout>
	);
}
