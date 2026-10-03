"use client";

import { useRouter } from "next/navigation";
import { AdminPostForm } from "@/components/admin/AdminPostForm";
import { adminRoutes } from "@/lib/admin/routes";

// back/src/achievement/create.ts は画像(image)・動画(movie)・ファイル(file)を別々に受け取るため、
// 選ばれたファイルの種類で送り先のフィールドを決める
const attachmentFieldOf = (file: File) => {
	if (file.type.startsWith("image/")) return "image";
	if (file.type.startsWith("video/")) return "movie";
	return "file";
};

/** 実績の投稿フォーム（Figma: achievements 2034:1621）。POST /api/achievement に送信し、成功したら一覧へ戻る */
export function AchievementPostForm() {
	const router = useRouter();

	return (
		<AdminPostForm
			endpoint="/api/achievement"
			attachment={{
				name: attachmentFieldOf,
				placeholder: "ファイルをアップロード",
			}}
			successMessage="実績を投稿しました。"
			onSuccess={() => router.push(adminRoutes.achievements)}
		/>
	);
}
