import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminMediaDetail } from "@/components/admin/media/AdminMediaDetail";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "メディア情報詳細 | 西尾ブレイズ 管理画面",
};

/** 投稿済みメディア情報の詳細（デザイン未作成。一覧の各行から開く） */
export default async function AdminMediaDetailPage({
	params,
}: PageProps<"/admin/media/[id]">) {
	const { id } = await params;
	return (
		<AdminPageLayout title="メディア情報詳細" backHref={adminRoutes.media}>
			<AdminMediaDetail id={id} />
		</AdminPageLayout>
	);
}
