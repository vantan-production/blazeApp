// 資料庫（back/src/document/index.ts）の型と、登録・編集フォームで使う制約。

import { z } from "zod";
// lib/validation/limits.ts の型には資料庫の項目がまだ無いため、生成済みの JSON を直接読む（値は back の VALIDATION_LIMITS と同じ）
import limits from "@/lib/validation/limits.generated.json";

/** GET /api/documents の1件 */
export type AdminDocument = {
	id: string;
	title: string;
	description: string | null;
	category: string | null;
	admin_id: string | null;
	/** 登録した人（アカウント削除済みなら「元管理者」） */
	admin_name: string;
	created_at: string;
	updated_at: string;
	/** S3 のファイル名（先頭に「登録時刻_」が付く）。ファイルが無ければ null */
	file_name: string | null;
	has_file: boolean;
};

/** POST / PATCH /api/documents が返す資料（一覧と違い admin_name・file_name は付かない） */
export type SavedDocument = Pick<
	AdminDocument,
	"id" | "title" | "description" | "category" | "created_at" | "updated_at"
>;

/** GET /api/documents/:id/download */
export type DocumentDownload = {
	id: string;
	/** 署名付きURL（発行から expires_in 秒だけ有効） */
	url: string;
	file_name: string | null;
	expires_in: number;
};

/**
 * 1ファイルの上限（back/src/utils/media.ts の MAX_FILE_SIZE = 10MB）。
 * 形式の制限は無い（processFileUpload はサイズしか見ない）
 */
export const DOCUMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;

const fileSizeMessage = "ファイルは10MB以下にしてください。";

const documentTitleSchema = z
	.string()
	.trim()
	.min(limits.documentTitle.min, "タイトルを入力してください。")
	.max(
		limits.documentTitle.max,
		`タイトルは${limits.documentTitle.max}文字以内で入力してください。`,
	);

const documentDescriptionSchema = z
	.string()
	.trim()
	.max(
		limits.documentDescription.max,
		`説明は${limits.documentDescription.max}文字以内で入力してください。`,
	);

// 分類は任意。空欄なら送らない（編集では空にすると分類を消す）
const optionalCategorySchema = z
	.string()
	.trim()
	.max(
		limits.category.max,
		`分類は${limits.category.max}文字以内で入力してください。`,
	);

/** 新規登録で一度に選べるファイル数 */
export const DOCUMENT_MAX_FILES = 10;

/** 新規登録の1ファイル分（1ファイル＝1資料として POST /api/documents を1回ずつ呼ぶ） */
export const documentCreateItemSchema = z.object({
	title: documentTitleSchema,
	file: z
		.instanceof(File)
		.refine((file) => file.size <= DOCUMENT_MAX_FILE_SIZE, fileSizeMessage),
});

/** 新規登録フォーム。分類・説明は選んだ全ファイルで共通 */
export const documentCreateSchema = z.object({
	category: optionalCategorySchema,
	description: documentDescriptionSchema,
	items: z
		.array(documentCreateItemSchema)
		.min(1, "ファイルを選択してください。")
		.max(
			DOCUMENT_MAX_FILES,
			`ファイルは一度に${DOCUMENT_MAX_FILES}個まで選択できます。`,
		),
});

/** 登録時のタイトルの初期値（ファイル名から拡張子を外したもの） */
export const titleFromFileName = (fileName: string) =>
	fileName.replace(/\.[^.]+$/, "");

/** 編集フォーム（PATCH /api/documents/:id。ファイルは差し替えるときだけ選ぶ） */
export const documentUpdateSchema = z.object({
	title: documentTitleSchema,
	category: optionalCategorySchema,
	description: documentDescriptionSchema,
	file: z
		.array(z.instanceof(File))
		.max(1)
		.refine(
			(files) => files.every((file) => file.size <= DOCUMENT_MAX_FILE_SIZE),
			fileSizeMessage,
		),
});

/** 表示用のファイル名（back が付けた「登録時刻_」を外す） */
export const displayFileName = (fileName: string) =>
	fileName.replace(/^\d+_/, "");

/** ISO日時を YYYY/MM/DD にする */
export const formatDocumentDate = (iso: string) => {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};
