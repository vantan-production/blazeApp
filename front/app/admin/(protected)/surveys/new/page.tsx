import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { SurveyBackLink } from "@/components/admin/surveys/SurveyBackLink";
import { SurveyForm } from "@/components/admin/surveys/SurveyForm";
import { adminSurveyRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "アンケートを作成 | 西尾ブレイズ 管理画面",
};

/** アンケート・出欠確認の新規作成（POST /api/surveys） */
export default function AdminSurveyNewPage() {
	return (
		<AdminPageLayout title="アンケート作成">
			<SurveyBackLink href={adminSurveyRoutes.list} label="一覧に戻る" />
			<SurveyForm />
		</AdminPageLayout>
	);
}
