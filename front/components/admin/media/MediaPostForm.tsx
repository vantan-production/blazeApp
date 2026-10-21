"use client";

import { useRouter } from "next/navigation";
import { AdminPostForm } from "@/components/admin/AdminPostForm";
import type { MediaPostDetail } from "@/lib/admin/media";
import { adminMediaDetailPath, adminRoutes } from "@/lib/admin/routes";

type Props = {
	/** 渡すと編集（PATCH /api/media/:id）、省略すると新規投稿（POST） */
	post?: MediaPostDetail;
};

/**
 * メディア情報の投稿フォーム（Figma: media 2039:1719）。POST /api/media に送信し、成功したら一覧へ戻る。
 * 編集では今の内容を入れて PATCH し、成功したら詳細へ戻る。本文の画像は back の PATCH が受け取らないため編集では出さない
 */
export function MediaPostForm({ post }: Props) {
	const router = useRouter();

	if (post) {
		return (
			<AdminPostForm
				endpoint={`/api/media/${post.id}`}
				method="PATCH"
				initialValues={{ title: post.title, body: post.body }}
				attachment={{
					name: "image",
					placeholder: "サムネイル画像を差し替える（任意）",
					accept: "image/*",
				}}
				successMessage="メディア情報を更新しました。"
				onSuccess={() => router.push(adminMediaDetailPath(post.id))}
			/>
		);
	}

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
