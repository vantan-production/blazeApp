"use client";

import { AdminPostEditLoader } from "@/components/admin/AdminPostEditLoader";
import type { MediaPostDetail } from "@/lib/admin/media";
import { MediaPostForm } from "./MediaPostForm";

/** メディア情報の編集画面（GET /api/media/:id で今の内容を読み込む） */
export function MediaEdit({ id }: { id: string }) {
	return (
		<AdminPostEditLoader<MediaPostDetail>
			endpoint={`/api/media/${id}`}
			label="メディア情報"
		>
			{(post) => <MediaPostForm post={post} />}
		</AdminPostEditLoader>
	);
}
