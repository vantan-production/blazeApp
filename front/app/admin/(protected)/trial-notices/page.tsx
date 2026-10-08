import { AdminButtonLink } from "@/components/admin/AdminButton";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { TrialNoticeList } from "@/components/admin/trial-notices/TrialNoticeList";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "体験申込者への連絡 | 西尾ブレイズ 管理画面",
};

/** 体験申込者への連絡メールの送信履歴（Figma なし。問い合わせ一覧の見た目に合わせている） */
export default function AdminTrialNoticesPage() {
	return (
		<AdminPageLayout title="体験申込者への連絡">
			<div className="flex w-full flex-col items-center gap-9">
				<div className="w-full px-5">
					<AdminButtonLink
						href={adminRoutes.trialNoticesNew}
						variant="light"
						size="sm"
					>
						新しく送る
					</AdminButtonLink>
				</div>
				<TrialNoticeList />
			</div>
		</AdminPageLayout>
	);
}
