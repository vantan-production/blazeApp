import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { NewsPostForm } from "@/components/admin/news/NewsPostForm";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "ニュースを投稿 | 西尾ブレイズ 管理画面",
};

/** ニュースの新規投稿（Figma: news 2030:1489） */
export default function AdminNewsNewPage() {
	return (
		<AdminPageLayout title="ニュース投稿作成" backHref={adminRoutes.news}>
			<NewsPostForm />
		</AdminPageLayout>
	);
}
