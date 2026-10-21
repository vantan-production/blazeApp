import { MembersPageLayout } from "@/components/members/MembersPageLayout";
import { NoticeDetail } from "@/components/members/notices/NoticeDetail";
import { memberRoutes } from "@/lib/members/routes";

export const metadata = {
	title: "お知らせ詳細 | 西尾ブレイズ 関係者ページ",
};

/** 関係者限定お知らせの詳細（開くと既読になる） */
export default async function MemberNoticeDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		<MembersPageLayout title="お知らせ" backHref={memberRoutes.notices}>
			<NoticeDetail noticeId={id} />
		</MembersPageLayout>
	);
}
