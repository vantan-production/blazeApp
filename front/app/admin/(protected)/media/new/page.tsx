import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { MediaPostForm } from "@/components/admin/media/MediaPostForm";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "メディア情報を投稿 | 西尾ブレイズ 管理画面",
};

/** メディア情報の新規投稿（Figma: media 2039:1719） */
export default function AdminMediaNewPage() {
	return (
		<AdminPageLayout title="メディア情報作成" backHref={adminRoutes.media}>
			<MediaPostForm />
		</AdminPageLayout>
	);
}
