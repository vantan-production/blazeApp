import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminPostForm } from "@/components/admin/AdminPostForm";

export const metadata = {
	title: "メディア情報 | 西尾ブレイズ 管理画面",
};

/** メディア情報の投稿（Figma: media 2039:1719）。POST /api/media に送信する */
export default function AdminMediaPage() {
	return (
		<AdminPageLayout title="メディア情報">
			{/* TODO: 投稿済みメディア情報の一覧・編集（デザイン未作成。API は GET/PATCH/DELETE /api/media がある） */}
			<AdminPostForm
				endpoint="/api/media"
				attachment={{
					name: "image",
					placeholder: "アイキャッチ画像を選択",
					accept: "image/*",
				}}
				successMessage="メディア情報を投稿しました。"
				narrowFields
			/>
		</AdminPageLayout>
	);
}
