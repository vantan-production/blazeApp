import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { SubmissionList } from "@/components/admin/submissions/SubmissionList";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "投稿申請 | 西尾ブレイズ 管理画面",
};

/** 関係者からの投稿申請（ニュース記事）の承認待ち一覧と承認・差し戻し（デザイン未作成。取り下げ依頼と同じ作り） */
export default function AdminSubmissionsPage() {
	return (
		<AdminPageLayout title="投稿申請" backHref={adminRoutes.top}>
			<SubmissionList />
		</AdminPageLayout>
	);
}
