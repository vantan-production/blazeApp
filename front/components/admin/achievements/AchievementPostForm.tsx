"use client";

import { useRouter } from "next/navigation";
import { AdminPostForm } from "@/components/admin/AdminPostForm";
import type { AchievementPostDetail } from "@/lib/admin/achievements";
import { adminAchievementDetailPath, adminRoutes } from "@/lib/admin/routes";

// back/src/utils/media.ts の許可拡張子と同じ一覧。
// back は image / movie を拡張子で検査するため、MIME タイプ（RAW や一部の HEIC では空になる）ではなく拡張子で振り分ける
const IMAGE_EXTENSIONS = [
	"jpeg",
	"jpg",
	"heic",
	"heif",
	"png",
	"webp",
	"cr3",
	"cr2",
	"arw",
	"nef",
	"raf",
	"dng",
];
const VIDEO_EXTENSIONS = ["mp4", "mov"];

// back/src/achievement/create.ts は画像(image)・動画(movie)・ファイル(file)を別々に受け取るため、
// 選ばれたファイルの拡張子で送り先のフィールドを決める。
// 対象外の画像・動画（gif や avi など）は image / movie に送ると 400 になるため、ファイルとして添付する
const attachmentFieldOf = (file: File) => {
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	if (IMAGE_EXTENSIONS.includes(ext)) return "image";
	if (VIDEO_EXTENSIONS.includes(ext)) return "movie";
	return "file";
};

type Props = {
	/** 渡すと編集（PATCH /api/achievement/:id）、省略すると新規投稿（POST） */
	post?: AchievementPostDetail;
};

/**
 * 実績の投稿フォーム（Figma: achievements 2034:1621）。POST /api/achievement に送信し、成功したら一覧へ戻る。
 * 編集では今の内容を入れて PATCH し、成功したら詳細へ戻る。添付は選んだ種類（画像・動画・ファイル）だけ差し替わる。
 * 本文の画像は back の PATCH が受け取らないため編集では出さない
 */
export function AchievementPostForm({ post }: Props) {
	const router = useRouter();

	if (post) {
		return (
			<AdminPostForm
				endpoint={`/api/achievement/${post.id}`}
				method="PATCH"
				initialValues={{ title: post.title, body: post.body }}
				attachment={{
					name: attachmentFieldOf,
					placeholder: "ファイルを差し替える（任意）",
				}}
				successMessage="実績を更新しました。"
				onSuccess={() => router.push(adminAchievementDetailPath(post.id))}
			/>
		);
	}

	return (
		<AdminPostForm
			endpoint="/api/achievement"
			attachment={{
				name: attachmentFieldOf,
				placeholder: "ファイルをアップロード",
			}}
			successMessage="実績を投稿しました。"
			bodyImages={{ name: "images", accept: "image/*" }}
			onSuccess={() => router.push(adminRoutes.achievements)}
		/>
	);
}
