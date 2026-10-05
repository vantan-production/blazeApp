import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { GameMosaicEditor } from "@/components/admin/game/GameMosaicEditor";
import { adminGameDetailPath } from "@/lib/admin/routes";

export const metadata = {
	title: "モザイク編集 | 西尾ブレイズ 管理画面",
};

/** 試合風景の画像1枚のモザイク編集（デザイン未作成。投稿フォームと同じ枠で作る。詳細の各画像から開く） */
export default async function AdminGameMosaicPage({
	params,
}: PageProps<"/admin/game/[id]/images/[imageId]/mosaic">) {
	const { id, imageId } = await params;
	return (
		<AdminPageLayout title="モザイク編集" backHref={adminGameDetailPath(id)}>
			<GameMosaicEditor gameId={id} imageId={imageId} />
		</AdminPageLayout>
	);
}
