import { DocumentList } from "@/components/members/documents/DocumentList";
import { MembersPageLayout } from "@/components/members/MembersPageLayout";

export const metadata = {
	title: "資料 | 西尾ブレイズ 関係者ページ",
};

/** 関係者限定の資料（規約・年間予定など）の一覧とダウンロード */
export default function MemberDocumentsPage() {
	return (
		<MembersPageLayout title="資料">
			<DocumentList />
		</MembersPageLayout>
	);
}
