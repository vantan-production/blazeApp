import { MembersPageLayout } from "@/components/members/MembersPageLayout";
import { MemberSubmissions } from "@/components/members/submissions/MemberSubmissions";

export const metadata = {
	title: "記事の投稿申請 | 西尾ブレイズ 関係者ページ",
};

/** 記事の投稿申請と、自分の申請の状況 */
export default function MemberSubmissionsPage() {
	return (
		<MembersPageLayout title="記事の投稿申請">
			<MemberSubmissions />
		</MembersPageLayout>
	);
}
