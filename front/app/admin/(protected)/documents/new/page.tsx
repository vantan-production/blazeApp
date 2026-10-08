import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { DocumentCreateForm } from "@/components/admin/documents/DocumentCreateForm";
import { DocumentsBackLink } from "@/components/admin/documents/DocumentsBackLink";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "資料を登録 | 西尾ブレイズ 管理画面",
};

/** 資料の新規登録（デザイン未作成。ほかの投稿画面と同じ枠で作る） */
export default function AdminDocumentsNewPage() {
	return (
		<AdminPageLayout title="資料を登録">
			<DocumentsBackLink href={adminRoutes.documents}>
				資料庫へ戻る
			</DocumentsBackLink>
			<DocumentCreateForm />
		</AdminPageLayout>
	);
}
