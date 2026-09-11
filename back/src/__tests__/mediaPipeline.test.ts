// 変換パイプライン自体の単体テスト（RAW→WebP変換・画像圧縮・動画圧縮・バリデーション）
// src/utils/media.ts が対象。API経由の統合テスト（gameImg.test.ts等）はモック画像を1枚通すだけで、
// このパイプライン自体の分岐（RAW抽出・リサイズ挙動・動画圧縮・バリデーション境界値）は未検証だった。

import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import {
	compressImage,
	compressVideo,
	extractRawPreview,
	isRawImageExtension,
	isValidImageExtension,
	isValidVideoExtension,
	sanitizeHtml,
	validateFileExtension,
	validateFileSize,
	validateMultipleFiles,
	validateRawFileSize,
} from "../utils/media.js";

ffmpeg.setFfmpegPath(ffmpegPath);

function fakeFile(size: number, name = "a.png"): File {
	return { name, size } as unknown as File;
}

describe("validateFileExtension", () => {
	it("許可リストに含まれる拡張子はtrue", () => {
		expect(validateFileExtension("photo.png", ["png", "jpg"])).toBe(true);
	});

	it("大文字小文字を区別しない", () => {
		expect(validateFileExtension("photo.PNG", ["png"])).toBe(true);
	});

	it("許可リストにない拡張子はfalse", () => {
		expect(validateFileExtension("photo.gif", ["png", "jpg"])).toBe(false);
	});

	it("拡張子がないファイル名はfalse", () => {
		expect(validateFileExtension("photo", ["png"])).toBe(false);
	});
});

describe("isValidImageExtension / isValidVideoExtension / isRawImageExtension", () => {
	it.each([
		["photo.jpg", true],
		["photo.jpeg", true],
		["photo.png", true],
		["photo.webp", true],
		["photo.heic", true],
		["photo.cr2", true],
		["photo.mp4", false],
		["photo", false],
	])("isValidImageExtension(%s) -> %s", (name, expected) => {
		expect(isValidImageExtension(name)).toBe(expected);
	});

	it.each([
		["video.mp4", true],
		["video.mov", true],
		["video.avi", false],
		["video.png", false],
	])("isValidVideoExtension(%s) -> %s", (name, expected) => {
		expect(isValidVideoExtension(name)).toBe(expected);
	});

	it.each([
		["photo.cr3", true],
		["photo.cr2", true],
		["photo.arw", true],
		["photo.nef", true],
		["photo.raf", true],
		["photo.dng", true],
		["photo.jpg", false],
	])("isRawImageExtension(%s) -> %s", (name, expected) => {
		expect(isRawImageExtension(name)).toBe(expected);
	});
});

describe("validateFileSize / validateRawFileSize", () => {
	it("通常画像は10MBちょうどまでOK", () => {
		expect(validateFileSize(10 * 1024 * 1024)).toBe(true);
	});

	it("通常画像は10MBを1byteでも超えるとNG", () => {
		expect(validateFileSize(10 * 1024 * 1024 + 1)).toBe(false);
	});

	it("RAWは100MBちょうどまでOK", () => {
		expect(validateRawFileSize(100 * 1024 * 1024)).toBe(true);
	});

	it("RAWは100MBを1byteでも超えるとNG", () => {
		expect(validateRawFileSize(100 * 1024 * 1024 + 1)).toBe(false);
	});
});

describe("validateMultipleFiles", () => {
	it("10枚以下・合計100MB以下・個別10MB以下ならnull", () => {
		const files = Array.from({ length: 10 }, (_, i) =>
			fakeFile(1024, `f${i}.png`),
		);
		expect(validateMultipleFiles(files)).toBeNull();
	});

	it("11枚以上は枚数エラー", () => {
		const files = Array.from({ length: 11 }, (_, i) =>
			fakeFile(1024, `f${i}.png`),
		);
		expect(validateMultipleFiles(files)).toContain("最大10枚");
	});

	it("合計サイズが200MBを超えると合計サイズエラー", () => {
		const files = [
			fakeFile(90 * 1024 * 1024, "a.cr2"),
			fakeFile(90 * 1024 * 1024, "b.cr2"),
			fakeFile(90 * 1024 * 1024, "c.cr2"),
		];
		expect(validateMultipleFiles(files)).toContain("合計サイズ");
	});

	it("個別ファイルが10MBを超えると個別サイズエラー", () => {
		const files = [fakeFile(11 * 1024 * 1024, "big.png")];
		expect(validateMultipleFiles(files)).toContain("big.png");
	});

	it("RAWは10MBを超えても個別サイズエラーにならない", () => {
		// 実カメラRAWは常に10MBを超えるため、RAWだけは100MB枠で判定する
		expect(
			validateMultipleFiles([fakeFile(60 * 1024 * 1024, "photo.cr2")]),
		).toBeNull();
	});

	it("RAWでも100MBを超えると個別サイズエラー", () => {
		const files = [fakeFile(101 * 1024 * 1024, "huge.cr2")];
		expect(validateMultipleFiles(files)).toContain("huge.cr2");
	});
});

describe("compressImage", () => {
	it("画像をWebP形式に変換する", async () => {
		const src = await sharp({
			create: {
				width: 10,
				height: 10,
				channels: 3,
				background: { r: 255, g: 0, b: 0 },
			},
		})
			.png()
			.toBuffer();

		const result = await compressImage(src);

		expect(result.contentType).toBe("image/webp");
		expect(result.extension).toBe("webp");
		const meta = await sharp(result.data).metadata();
		expect(meta.format).toBe("webp");
	});

	it("1920pxを超える画像は1920px以内に縮小される", async () => {
		const src = await sharp({
			create: {
				width: 3000,
				height: 1000,
				channels: 3,
				background: { r: 0, g: 255, b: 0 },
			},
		})
			.png()
			.toBuffer();

		const result = await compressImage(src);
		const meta = await sharp(result.data).metadata();

		expect(meta.width).toBeLessThanOrEqual(1920);
		expect(meta.height).toBeLessThanOrEqual(1920);
	});

	it("1920px以下の画像は拡大されない", async () => {
		const src = await sharp({
			create: {
				width: 10,
				height: 10,
				channels: 3,
				background: { r: 0, g: 0, b: 255 },
			},
		})
			.png()
			.toBuffer();

		const result = await compressImage(src);
		const meta = await sharp(result.data).metadata();

		expect(meta.width).toBe(10);
		expect(meta.height).toBe(10);
	});

	// EXIF Orientation は「保存されているピクセルをどう回して表示するか」の指定。
	// WebP はこの指定を持てないため、変換時に実ピクセルへ焼き込まないと向きが失われる。
	it.each([
		[6, 600, 400, 400, 600], // 90度回転 → 縦長になる
		[8, 600, 400, 400, 600], // 270度回転 → 縦長になる
		[3, 600, 400, 600, 400], // 180度回転 → 縦横は変わらない
		[1, 600, 400, 600, 400], // 回転不要
	])(
		"EXIF Orientation=%i の画像は向きを焼き込んで変換される",
		async (orientation, srcW, srcH, expectedW, expectedH) => {
			const src = await sharp({
				create: {
					width: srcW as number,
					height: srcH as number,
					channels: 3,
					background: { r: 1, g: 2, b: 3 },
				},
			})
				.withMetadata({ orientation: orientation as number })
				.jpeg()
				.toBuffer();

			const result = await compressImage(src);
			const meta = await sharp(result.data).metadata();

			expect(meta.width).toBe(expectedW);
			expect(meta.height).toBe(expectedH);
		},
	);

	it("画像として解釈できないバッファはエラーを投げる", async () => {
		await expect(compressImage(Buffer.from("not an image"))).rejects.toThrow(
			"画像のWebP変換に失敗しました",
		);
	});
});

describe("extractRawPreview", () => {
	// RAWの中身を模したバッファを組み立てる。
	// 実際のRAWは「ゴミ（メタデータ・センサーデータ）の中にJPEGが複数埋まっている」構造なので、
	// それを最小限で再現する。実カメラファイルでの検証は mediaRealFiles.test.ts が担当。
	async function jpegOf(width: number, height: number): Promise<Buffer> {
		return sharp({
			create: {
				width,
				height,
				channels: 3,
				background: { r: 10, g: 120, b: 200 },
			},
		})
			.jpeg()
			.toBuffer();
	}

	function padding(size: number): Buffer {
		return Buffer.alloc(size, 0x5a);
	}

	it("埋め込まれたJPEGを抽出して返す", async () => {
		const jpeg = await jpegOf(320, 240);
		const raw = Buffer.concat([padding(2048), jpeg, padding(1024)]);

		const result = await extractRawPreview(raw);

		const meta = await sharp(result).metadata();
		expect(meta.format).toBe("jpeg");
		expect(meta.width).toBe(320);
		expect(meta.height).toBe(240);
	});

	it("JPEGが複数埋まっている場合は一番大きいものを選ぶ", async () => {
		// 実RAWにはサムネイル(160x120程度)とフルサイズプレビューの両方が入っている。
		// 小さい方を掴むと、掲載用の画像がサムネイルに縮退してしまう。
		const thumb = await jpegOf(160, 120);
		const full = await jpegOf(1600, 1200);
		const raw = Buffer.concat([
			padding(512),
			thumb,
			padding(512),
			full,
			padding(512),
		]);

		const result = await extractRawPreview(raw);

		const meta = await sharp(result).metadata();
		expect(meta.width).toBe(1600);
		expect(meta.height).toBe(1200);
	});

	it("JPEGの並び順が逆でも一番大きいものを選ぶ", async () => {
		const thumb = await jpegOf(160, 120);
		const full = await jpegOf(1600, 1200);
		const raw = Buffer.concat([
			padding(512),
			full,
			padding(512),
			thumb,
			padding(512),
		]);

		const result = await extractRawPreview(raw);

		const meta = await sharp(result).metadata();
		expect(meta.width).toBe(1600);
	});

	it("JPEGが埋まっていない場合はエラーを投げる", async () => {
		await expect(extractRawPreview(padding(8192))).rejects.toThrow(
			"プレビュー画像を抽出できませんでした",
		);
	});

	it("空バッファの場合もエラーを投げる", async () => {
		await expect(extractRawPreview(Buffer.alloc(0))).rejects.toThrow(
			"プレビュー画像を抽出できませんでした",
		);
	});
});

describe("compressVideo", () => {
	let sourceVideo: Buffer;

	beforeAll(async () => {
		const outputPath = join(tmpdir(), `media-pipeline-src-${randomUUID()}.mp4`);
		await new Promise<void>((resolve, reject) => {
			ffmpeg()
				.input("color=c=blue:s=64x64:d=1:r=10")
				.inputFormat("lavfi")
				.outputOptions(["-c:v libx264", "-pix_fmt yuv420p"])
				.output(outputPath)
				.on("end", () => resolve())
				.on("error", reject)
				.run();
		});
		sourceVideo = await readFile(outputPath);
		await unlink(outputPath).catch(() => {});
	}, 30000);

	it("動画をMP4形式に圧縮する", async () => {
		const result = await compressVideo(sourceVideo);

		expect(result.contentType).toBe("video/mp4");
		expect(result.extension).toBe("mp4");
		// MP4コンテナのシグネチャ（ftypボックス）を確認
		expect(result.data.subarray(4, 8).toString("ascii")).toBe("ftyp");
	}, 30000);

	it("動画として解釈できないバッファはエラーになる", async () => {
		await expect(
			compressVideo(Buffer.from("not a video")),
		).rejects.toBeTruthy();
	}, 30000);
});

describe("sanitizeHtml", () => {
	it("HTMLタグをエスケープする", () => {
		expect(sanitizeHtml("<script>alert('xss')</script>")).toBe(
			"&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;",
		);
	});

	it("&, \", ' をそれぞれエスケープする", () => {
		expect(sanitizeHtml(`a & b " c ' d`)).toBe("a &amp; b &quot; c &#x27; d");
	});
});
