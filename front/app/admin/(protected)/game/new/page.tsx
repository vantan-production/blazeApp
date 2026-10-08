import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { GameImageForm } from "@/components/admin/game/GameImageForm";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "試合風景を投稿 | 西尾ブレイズ 管理画面",
};

/** 試合風景の新規投稿（Figma: game 2034:1657）。他の投稿画面とそろえて見出しボックスと「戻る」を出す */
export default function AdminGameNewPage() {
	return (
		<AdminPageLayout title="試合風景作成" backHref={adminRoutes.game}>
			<GameImageForm />
		</AdminPageLayout>
	);
}
