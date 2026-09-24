import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { NewsPostForm } from "@/components/admin/news/NewsPostForm";

export const metadata = {
	title: "ニュースを投稿 | 西尾ブレイズ 管理画面",
};

/** ニュースの新規投稿（Figma: news 2030:1489） */
export default function AdminNewsNewPage() {
	return (
		<AdminPageLayout title="ニュース投稿">
			<NewsPostForm />
		</AdminPageLayout>
	);
}
