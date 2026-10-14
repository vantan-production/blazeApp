import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { MatchResultForm } from "@/components/admin/match-results/MatchResultForm";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "試合結果作成 | 西尾ブレイズ 管理画面",
};

/** 試合結果の新規登録（POST /api/match-results） */
export default function AdminMatchResultNewPage() {
	return (
		<AdminPageLayout title="試合結果作成" backHref={adminRoutes.matchResults}>
			<MatchResultForm />
		</AdminPageLayout>
	);
}
