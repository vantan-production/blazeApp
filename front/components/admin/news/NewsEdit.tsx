"use client";

import { AdminPostEditLoader } from "@/components/admin/AdminPostEditLoader";
import type { NewsPostDetail } from "@/lib/admin/news";
import { NewsPostForm } from "./NewsPostForm";

/** ニュースの編集画面（GET /api/news-post/:id で今の内容を読み込む） */
export function NewsEdit({ id }: { id: string }) {
	return (
		<AdminPostEditLoader<NewsPostDetail>
			endpoint={`/api/news-post/${id}`}
			label="お知らせ"
		>
			{(post) => <NewsPostForm post={post} />}
		</AdminPostEditLoader>
	);
}
