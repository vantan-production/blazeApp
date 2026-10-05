import { MembersPageLayout } from "@/components/members/MembersPageLayout";
import { NoticeList } from "@/components/members/notices/NoticeList";

export const metadata = {
	title: "お知らせ | 西尾ブレイズ 関係者ページ",
};

/** 関係者限定お知らせの一覧 */
export default function MemberNoticesPage() {
	return (
		<MembersPageLayout title="お知らせ">
			<NoticeList />
		</MembersPageLayout>
	);
}
