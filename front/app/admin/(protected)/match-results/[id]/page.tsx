import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { MatchResultEdit } from "@/components/admin/match-results/MatchResultEdit";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "試合結果を編集 | 西尾ブレイズ 管理画面",
};

/** 試合結果の編集・削除（PATCH / DELETE /api/match-results/:id） */
export default async function AdminMatchResultEditPage({
	params,
}: PageProps<"/admin/match-results/[id]">) {
	const { id } = await params;
	return (
		<AdminPageLayout title="試合結果を編集" backHref={adminRoutes.matchResults}>
			<MatchResultEdit id={id} />
		</AdminPageLayout>
	);
}
