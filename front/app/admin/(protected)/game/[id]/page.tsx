import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminGameDetail } from "@/components/admin/game/AdminGameDetail";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "試合風景詳細 | 西尾ブレイズ 管理画面",
};

/** 投稿済み試合風景の詳細（デザイン未作成。一覧の各行から開く） */
export default async function AdminGameDetailPage({
	params,
}: PageProps<"/admin/game/[id]">) {
	const { id } = await params;
	return (
		<AdminPageLayout title="試合風景詳細" backHref={adminRoutes.game}>
			<AdminGameDetail id={id} />
		</AdminPageLayout>
	);
}
