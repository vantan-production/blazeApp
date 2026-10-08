import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { NoticeBackLink } from "@/components/admin/notices/NoticeBackLink";
import { NoticeDetail } from "@/components/admin/notices/NoticeDetail";
import { adminNoticeRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "お知らせ詳細 | 西尾ブレイズ 管理画面",
};

/** 関係者向けお知らせの詳細（本文・既読状況・編集・削除。一覧の各行から開く） */
export default async function AdminNoticeDetailPage({
	params,
}: PageProps<"/admin/notices/[id]">) {
	const { id } = await params;
	return (
		<AdminPageLayout title="お知らせ詳細">
			<NoticeBackLink href={adminNoticeRoutes.list} label="一覧に戻る" />
			<NoticeDetail id={id} />
		</AdminPageLayout>
	);
}
