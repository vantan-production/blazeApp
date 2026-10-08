import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { NoticeBackLink } from "@/components/admin/notices/NoticeBackLink";
import { NoticeForm } from "@/components/admin/notices/NoticeForm";
import { adminNoticeRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "お知らせを作成 | 西尾ブレイズ 管理画面",
};

/** 関係者向けお知らせの新規作成（POST /api/notices） */
export default function AdminNoticeNewPage() {
	return (
		<AdminPageLayout title="お知らせ作成">
			<NoticeBackLink href={adminNoticeRoutes.list} label="一覧に戻る" />
			<NoticeForm />
		</AdminPageLayout>
	);
}
