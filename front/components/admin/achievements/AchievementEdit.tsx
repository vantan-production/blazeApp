"use client";

import { AdminPostEditLoader } from "@/components/admin/AdminPostEditLoader";
import type { AchievementPostDetail } from "@/lib/admin/achievements";
import { AchievementPostForm } from "./AchievementPostForm";

/** 実績の編集画面（GET /api/achievement/:id で今の内容を読み込む） */
export function AchievementEdit({ id }: { id: string }) {
	return (
		<AdminPostEditLoader<AchievementPostDetail>
			endpoint={`/api/achievement/${id}`}
			label="実績"
		>
			{(post) => <AchievementPostForm post={post} />}
		</AdminPostEditLoader>
	);
}
