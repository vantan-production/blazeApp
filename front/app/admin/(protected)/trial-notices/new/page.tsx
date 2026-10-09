import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { TrialNoticeForm } from "@/components/admin/trial-notices/TrialNoticeForm";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "連絡メールを送る | 西尾ブレイズ 管理画面",
};

/** 体験申込者を選んで連絡メールを送る（Figma なし。投稿フォームの見た目に合わせている） */
export default function AdminTrialNoticeNewPage() {
	return (
		<AdminPageLayout
			title="連絡メールを送る"
			backHref={adminRoutes.trialNotices}
		>
			<TrialNoticeForm />
		</AdminPageLayout>
	);
}
