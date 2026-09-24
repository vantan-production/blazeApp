import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AchievementPostForm } from "@/components/admin/achievements/AchievementPostForm";

export const metadata = {
	title: "実績更新 | 西尾ブレイズ 管理画面",
};

/** 実績の投稿（Figma: achievements 2034:1621） */
export default function AdminAchievementsPage() {
	return (
		<AdminPageLayout title="実績更新">
			{/* TODO: 投稿済み実績の一覧・編集（デザイン未作成。API は GET/PATCH/DELETE /api/achievement がある） */}
			{/* TODO: 画像・動画・ファイルを同時に添付できるようにするか要検討（API は各1つずつ受け取れるが、デザインの枠は1つ） */}
			<AchievementPostForm />
		</AdminPageLayout>
	);
}
