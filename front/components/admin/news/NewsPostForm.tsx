"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPostForm } from "@/components/admin/AdminPostForm";
import type { NewsPostDetail } from "@/lib/admin/news";
import { adminNewsDetailPath, adminRoutes } from "@/lib/admin/routes";
import { CategorySelector } from "./CategorySelector";

type Props = {
	/** 渡すと編集（PATCH /api/news-post/:id）、省略すると新規投稿（POST） */
	post?: NewsPostDetail;
};

/**
 * ニュース投稿フォーム（Figma: news 2030:1489）。POST /api/news-post に送信し、成功したら一覧へ戻る。
 * 編集では今の内容を入れて PATCH し、成功したら詳細へ戻る。本文の画像は back の PATCH が受け取らないため編集では出さない
 */
export function NewsPostForm({ post }: Props) {
	const router = useRouter();
	const [category, setCategory] = useState<string | undefined>(
		post?.category ?? undefined,
	);

	if (post) {
		return (
			<AdminPostForm
				endpoint={`/api/news-post/${post.id}`}
				method="PATCH"
				initialValues={{ title: post.title, body: post.body }}
				attachment={{
					name: "image",
					placeholder: "サムネイル画像を差し替える（任意）",
					accept: "image/*",
				}}
				successMessage="お知らせを更新しました。"
				extraFields={
					<CategorySelector value={category} onChange={setCategory} />
				}
				// 空文字を送るとカテゴリーを外せる（未送信は「変更なし」になる）
				extraValues={{ category: category ?? "" }}
				submitGap="sm"
				onSuccess={() => router.push(adminNewsDetailPath(post.id))}
			/>
		);
	}

	return (
		<AdminPostForm
			endpoint="/api/news-post"
			attachment={{
				name: "image",
				placeholder: "サムネイル画像を選択",
				accept: "image/*",
			}}
			successMessage="お知らせを投稿しました。"
			extraFields={<CategorySelector value={category} onChange={setCategory} />}
			extraValues={{ category }}
			bodyImages={{ name: "images", accept: "image/*" }}
			submitGap="sm"
			onSuccess={() => router.push(adminRoutes.news)}
		/>
	);
}
