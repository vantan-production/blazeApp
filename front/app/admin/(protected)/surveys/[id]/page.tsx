import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { SurveyBackLink } from "@/components/admin/surveys/SurveyBackLink";
import { SurveyDetailView } from "@/components/admin/surveys/SurveyDetailView";
import { adminSurveyRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "アンケート詳細 | 西尾ブレイズ 管理画面",
};

/** アンケート・出欠確認の詳細（設問・集計結果・未回答者・編集・削除。一覧の各行から開く） */
export default async function AdminSurveyDetailPage({
	params,
}: PageProps<"/admin/surveys/[id]">) {
	const { id } = await params;
	return (
		<AdminPageLayout title="アンケート詳細">
			<SurveyBackLink href={adminSurveyRoutes.list} label="一覧に戻る" />
			<SurveyDetailView id={id} />
		</AdminPageLayout>
	);
}
