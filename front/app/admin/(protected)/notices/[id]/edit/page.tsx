import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { NoticeBackLink } from "@/components/admin/notices/NoticeBackLink";
import { NoticeEdit } from "@/components/admin/notices/NoticeEdit";
import { adminNoticeDetailPath } from "@/lib/admin/routes";

export const metadata = {
	title: "お知らせを編集 | 西尾ブレイズ 管理画面",
};

/** 関係者向けお知らせの編集（PATCH /api/notices/:id。詳細画面の「編集する」から開く） */
export default async function AdminNoticeEditPage({
	params,
}: PageProps<"/admin/notices/[id]/edit">) {
	const { id } = await params;
	return (
		<AdminPageLayout title="お知らせ編集">
			<NoticeBackLink href={adminNoticeDetailPath(id)} label="詳細に戻る" />
			<NoticeEdit id={id} />
		</AdminPageLayout>
	);
}
