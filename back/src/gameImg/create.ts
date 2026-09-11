// POST /api/gameImg — 試合風景を投稿（管理者のみ、画像必須）

import type { Context } from "hono";
import {
	compressUploadedImage,
	db,
	deleteFromS3,
	game,
	images,
	isValidImageExtension,
	uploadToS3,
	validateMultipleFiles,
} from "../shared/index.js";

export const create = async (c: Context) => {
	const user = c.get("user") as { id: string };
	const body = await c.req.parseBody({ all: true });

	// 画像ファイルを取得（単体・複数どちらにも対応）
	const imageInput = body["image"];
	const imageFiles: File[] = Array.isArray(imageInput)
		? imageInput.filter((i): i is File => i instanceof File)
		: imageInput instanceof File
			? [imageInput]
			: [];

	if (imageFiles.length === 0) {
		return c.json({ success: false, errors: "画像は必須です。" }, 400);
	}

	// 全画像の拡張子チェック
	for (const file of imageFiles) {
		if (!isValidImageExtension(file.name)) {
			return c.json(
				{
					success: false,
					errors: `「${file.name}」は許可されていない画像形式です。`,
				},
				400,
			);
		}
	}

	// 枚数・合計サイズ・個別サイズをまとめて判定する。
	// 個別サイズはRAWなら100MB、それ以外は10MB（validateImageFileSize）。
	// 合計側の上限が無いと、RAWを10枚並べただけでタスクのメモリを超えるため必ず通す。
	const sizeError = validateMultipleFiles(imageFiles);
	if (sizeError) {
		return c.json({ success: false, errors: sizeError }, 400);
	}

	// 変換とアップロードを**DBに書く前に**すべて終わらせる。
	// compressUploadedImage は「埋め込みプレビューを持たないRAW」「libheifが展開できないHEIC」で
	// 例外を投げる。gameレコードを作ってから途中で投げると、画像が一部しか無い投稿が残り、
	// 呼び出し側にはメッセージの無い500だけが返る。
	// 失敗時は mediaHandler.processImageUpload と同じく原因付きの400にし、
	// 先にアップロード済みのオブジェクトはS3から消す。
	const uploadPrefix = `game/${crypto.randomUUID()}`;
	const uploadedKeys: string[] = [];

	const rollbackUploads = async (): Promise<void> => {
		// 後片付けの失敗で本来のエラーを潰さない（残っても孤児オブジェクトになるだけ）
		await Promise.allSettled(uploadedKeys.map((key) => deleteFromS3(key)));
	};

	try {
		for (const file of imageFiles) {
			const buffer = Buffer.from(await file.arrayBuffer());
			const compressed = await compressUploadedImage(buffer, file.name);
			const s3Key = `${uploadPrefix}/${Date.now()}_${Math.random().toString(36).slice(2)}.${compressed.extension}`;
			await uploadToS3(compressed.data, s3Key, compressed.contentType);
			uploadedKeys.push(s3Key);
		}
	} catch (err) {
		await rollbackUploads();
		return c.json(
			{
				success: false,
				errors: err instanceof Error ? err.message : "画像の変換に失敗しました。",
			},
			400,
		);
	}

	// メイン画像は1枚目。imagesテーブルの1行目と同じS3キーを指す。
	// 別途アップロードした複製にすると、モザイク適用（applyMosaic）や掲載同意の取り下げが
	// imagesテーブル側にしか効かず、game.img だけがモザイク前の画像を配り続けてしまう。
	const mainS3Key = uploadedKeys[0]!;

	try {
		// 投稿本体と画像行は必ず揃って入る。片方だけ残ると画像の無い投稿になる
		const inserted = await db.transaction(async (tx) => {
			const rows = await tx
				.insert(game)
				.values({ img: mainS3Key, admin_id: user.id })
				.returning();

			const gameId = rows[0]!.id;
			await tx
				.insert(images)
				.values(uploadedKeys.map((path) => ({ path, game_id: gameId })));

			return rows[0]!;
		});

		return c.json(
			{ success: true, message: "試合風景を投稿しました。", data: inserted },
			200,
		);
	} catch (err) {
		// DB側で落ちた場合もS3に孤児を残さない
		await rollbackUploads();
		throw err;
	}
};
