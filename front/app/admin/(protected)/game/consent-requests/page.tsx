import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { ConsentRequestList } from "@/components/admin/game/ConsentRequestList";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "取り下げ依頼 | 西尾ブレイズ 管理画面",
};

/** 試合風景の掲載取り下げ依頼の一覧と対応（デザイン未作成。試合風景一覧と同じ枠で作る） */
export default function AdminGameConsentRequestsPage() {
	return (
		<AdminPageLayout title="取り下げ依頼" backHref={adminRoutes.game}>
			<ConsentRequestList />
		</AdminPageLayout>
	);
}
