"use client";

import { AdminPostForm } from "@/components/admin/AdminPostForm";

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

/** 実績の投稿フォーム（Figma: achievements 2034:1621）。POST /api/achievement に送信する */
export function AchievementPostForm() {
	return (
		<AdminPostForm
			endpoint="/api/achievement"
			attachment={{
				name: attachmentFieldOf,
				placeholder: "ファイルをアップロード",
			}}
			successMessage="実績を投稿しました。"
		/>
	);
}
