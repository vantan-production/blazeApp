import { MembersPageLayout } from "@/components/members/MembersPageLayout";
import { SurveyList } from "@/components/members/surveys/SurveyList";

export const metadata = {
	title: "アンケート・出欠 | 西尾ブレイズ 関係者ページ",
};

/** アンケート・出欠確認の一覧 */
export default function MemberSurveysPage() {
	return (
		<MembersPageLayout title="アンケート・出欠">
			<SurveyList />
		</MembersPageLayout>
	);
}
