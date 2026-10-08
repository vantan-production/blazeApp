import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminNewsDetail } from "@/components/admin/news/AdminNewsDetail";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "ニュース詳細 | 西尾ブレイズ 管理画面",
};

/** 投稿済みニュースの詳細（デザイン未作成。一覧の各行から開く） */
export default async function AdminNewsDetailPage({
	params,
}: PageProps<"/admin/news/[id]">) {
	const { id } = await params;
	return (
		<AdminPageLayout title="ニュース詳細" backHref={adminRoutes.news}>
			<AdminNewsDetail id={id} />
		</AdminPageLayout>
	);
}
