import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { MediaEdit } from "@/components/admin/media/MediaEdit";
import { adminMediaDetailPath } from "@/lib/admin/routes";

export const metadata = {
	title: "メディア情報編集 | 西尾ブレイズ 管理画面",
};

/** メディア情報の編集（PATCH /api/media/:id。詳細画面の「編集する」から開く） */
export default async function AdminMediaEditPage({
	params,
}: PageProps<"/admin/media/[id]/edit">) {
	const { id } = await params;
	return (
		<AdminPageLayout
			title="メディア情報編集"
			backHref={adminMediaDetailPath(id)}
		>
			<MediaEdit id={id} />
		</AdminPageLayout>
	);
}
