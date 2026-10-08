import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { SurveyBackLink } from "@/components/admin/surveys/SurveyBackLink";
import { SurveyEdit } from "@/components/admin/surveys/SurveyEdit";
import { adminSurveyDetailPath } from "@/lib/admin/routes";

export const metadata = {
	title: "アンケートを編集 | 西尾ブレイズ 管理画面",
};

/** アンケートの編集（PATCH /api/surveys/:id。詳細画面の「編集する」から開く） */
export default async function AdminSurveyEditPage({
	params,
}: PageProps<"/admin/surveys/[id]/edit">) {
	const { id } = await params;
	return (
		<AdminPageLayout title="アンケート編集">
			<SurveyBackLink href={adminSurveyDetailPath(id)} label="詳細に戻る" />
			<SurveyEdit id={id} />
		</AdminPageLayout>
	);
}
