// POST /api/gameImg — 試合風景を投稿（管理者のみ、画像必須）

import type { Context } from "hono";
import {
	compressUploadedImage,
	db,
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

	// メイン画像（1枚目）を圧縮してS3にアップロード
	// RAWは埋め込みプレビューの抽出、HEICはlibheifでの展開を経てWebPになる
	const firstFile = imageFiles[0]!;
	const firstBuffer = Buffer.from(await firstFile.arrayBuffer());
	const firstCompressed = await compressUploadedImage(
		firstBuffer,
		firstFile.name,
	);
	const tempId = crypto.randomUUID();
	const mainS3Key = `game/${tempId}/${Date.now()}.${firstCompressed.extension}`;
	await uploadToS3(
		firstCompressed.data,
		mainS3Key,
		firstCompressed.contentType,
	);

	// DBにgameレコードを作成
	const inserted = await db
		.insert(game)
		.values({ img: mainS3Key, admin_id: user.id })
		.returning();

	const gameId = inserted[0]!.id;

	// 全画像をimagesテーブルに保存
	for (const file of imageFiles) {
		const buffer = Buffer.from(await file.arrayBuffer());
		const compressed = await compressUploadedImage(buffer, file.name);
		const s3Key = `game/${gameId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${compressed.extension}`;
		await uploadToS3(compressed.data, s3Key, compressed.contentType);
		await db.insert(images).values({ path: s3Key, game_id: gameId });
	}

	return c.json(
		{ success: true, message: "試合風景を投稿しました。", data: inserted[0] },
		200,
	);
};
