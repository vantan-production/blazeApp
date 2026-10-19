import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { NewsEdit } from "@/components/admin/news/NewsEdit";
import { adminNewsDetailPath } from "@/lib/admin/routes";

export const metadata = {
	title: "お知らせ編集 | 西尾ブレイズ 管理画面",
};

/** ニュースの編集（PATCH /api/news-post/:id。詳細画面の「編集する」から開く） */
export default async function AdminNewsEditPage({
	params,
}: PageProps<"/admin/news/[id]/edit">) {
	const { id } = await params;
	return (
		<AdminPageLayout title="お知らせ編集" backHref={adminNewsDetailPath(id)}>
			<NewsEdit id={id} />
		</AdminPageLayout>
	);
}
