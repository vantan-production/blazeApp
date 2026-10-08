import { MembersPageLayout } from "@/components/members/MembersPageLayout";
import { SurveyAnswerForm } from "@/components/members/surveys/SurveyAnswerForm";
import { memberRoutes } from "@/lib/members/routes";

export const metadata = {
	title: "アンケート回答 | 西尾ブレイズ 関係者ページ",
};

/** アンケート・出欠への回答 */
export default async function MemberSurveyDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		<MembersPageLayout title="アンケート回答" backHref={memberRoutes.surveys}>
			<SurveyAnswerForm surveyId={id} />
		</MembersPageLayout>
	);
}
