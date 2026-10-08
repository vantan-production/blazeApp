"use client";

import { useRouter } from "next/navigation";
import { AdminPostForm } from "@/components/admin/AdminPostForm";
import { adminRoutes } from "@/lib/admin/routes";

/** メディア情報の投稿フォーム（Figma: media 2039:1719）。POST /api/media に送信し、成功したら一覧へ戻る */
export function MediaPostForm() {
	const router = useRouter();

	return (
		<AdminPostForm
			endpoint="/api/media"
			attachment={{
				name: "image",
				placeholder: "サムネイル画像を選択",
				accept: "image/*",
			}}
			successMessage="メディア情報を投稿しました。"
			bodyImages={{ name: "images", accept: "image/*" }}
			onSuccess={() => router.push(adminRoutes.media)}
		/>
	);
}
