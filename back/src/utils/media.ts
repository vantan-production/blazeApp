// メディア処理ユーティリティ（画像圧縮・動画圧縮・バリデーション）

import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";

// FFmpegのパスを設定
ffmpeg.setFfmpegPath(ffmpegPath);

// カメラRAW形式：sharp 非対応のため、埋め込みJPEGプレビューを抽出してからWebPに変換
export const RAW_IMAGE_EXTENSIONS = ["cr3", "cr2", "arw", "nef", "raf", "dng"];

// 設計書に基づく許可拡張子
const ALLOWED_IMAGE_EXTENSIONS = [
	"jpeg",
	"jpg",
	"heic",
	"heif",
	"png",
	"webp",
	...RAW_IMAGE_EXTENSIONS,
];

const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "mov"];

// ファイルサイズ制限（設計書より）
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 1ファイル10MB
// RAW形式の上限。フルサイズ機のCR2は実測64MBあり、50MBでは実ファイルが通らなかったため100MBとする。
const MAX_RAW_FILE_SIZE = 100 * 1024 * 1024;
// 1リクエストの合計上限。RAW1ファイルが最大100MBになったため、
// 「10枚 × RAW上限」をそのまま許すとFargate(1GB)のメモリを確実に超える。
// 合計側で頭打ちにして、変換中のメモリ使用量が青天井にならないようにする。
const MAX_TOTAL_SIZE = 200 * 1024 * 1024;
const MAX_FILE_COUNT = 10; // 最大10枚

/**
 * ファイルの拡張子をチェック
 * @param filename - ファイル名
 * @param allowedExtensions - 許可する拡張子の配列
 * @returns 有効ならtrue
 */
export function validateFileExtension(
	filename: string,
	allowedExtensions: string[],
): boolean {
	const ext = filename.split(".").pop()?.toLowerCase() || "";
	return allowedExtensions.includes(ext);
}

/**
 * 画像の拡張子チェック
 */
export function isValidImageExtension(filename: string): boolean {
	return validateFileExtension(filename, ALLOWED_IMAGE_EXTENSIONS);
}

/**
 * 動画の拡張子チェック
 */
export function isValidVideoExtension(filename: string): boolean {
	return validateFileExtension(filename, ALLOWED_VIDEO_EXTENSIONS);
}

/**
 * カメラRAW形式かどうかチェック
 */
export function isRawImageExtension(filename: string): boolean {
	return validateFileExtension(filename, RAW_IMAGE_EXTENSIONS);
}

// ── RAWの埋め込みJPEGプレビュー抽出 ───────────────────────────────────────
//
// カメラRAWには、画面表示用のJPEGプレビューがほぼフルサイズで埋め込まれている。
// ただしその格納場所は形式ごとにまったく違う（CR2/ARW/NEF/DNGはTIFFのIFD、
// CR3はISO BMFFのボックス、RAFは独自ヘッダ）。
//
// 以前は exifr の thumbnail() を使っていたが、これはTIFFのIFD1にある
// 160x120程度のサムネイル専用APIで、フルサイズプレビューは取得できない。
// さらにCR3(BMFF)とRAFはそもそもパースできず "Unknown file format" で失敗していた。
//
// そこで形式ごとのパーサは持たず、ファイル全体からJPEGストリームを列挙して
// 一番大きいものを採用する。RAWのセンサーデータはロスレスJPEG(SOF3)なので、
// ベースライン/プログレッシブ(SOF0/1/2)だけを候補にすれば取り違えない。

const JPEG_SOI = Buffer.from([0xff, 0xd8, 0xff]);
const JPEG_EOI = Buffer.from([0xff, 0xd9]);

// SOFを探すためにヘッダを読み進める上限。これを超えたら候補として捨てる
const MAX_HEADER_SCAN = 1024 * 1024;
// 誤検出を含めても十分な候補数。これ以上は探索しない
const MAX_JPEG_CANDIDATES = 64;

type JpegCandidate = {
	/** SOIの位置 */
	offset: number;
	/** EOI直後の位置（見つからなければバッファ末尾） */
	end: number;
	width: number;
	height: number;
};

/**
 * SOI位置から始まるJPEGのセグメントを辿り、SOFから画像サイズを読む。
 * JPEGとして解釈できない場合・ロスレスJPEG(SOF3、RAWのセンサーデータ)の場合はnull。
 */
function readJpegSize(
	buffer: Buffer,
	soi: number,
): { width: number; height: number } | null {
	const limit = Math.min(buffer.length, soi + MAX_HEADER_SCAN);
	let pos = soi + 2;

	while (pos + 4 <= limit) {
		if (buffer[pos] !== 0xff) return null;

		let marker = buffer[pos + 1] as number;
		// 埋め草の 0xFF を読み飛ばす
		while (marker === 0xff && pos + 2 < limit) {
			pos += 1;
			marker = buffer[pos + 1] as number;
		}

		// 単独マーカー（ペイロードを持たない）
		if (
			marker === 0xd8 ||
			marker === 0x01 ||
			(marker >= 0xd0 && marker <= 0xd7)
		) {
			pos += 2;
			continue;
		}
		// SOFより先にスキャン開始／終端に来たら、想定外の構造なので候補から外す
		if (marker === 0xda || marker === 0xd9) return null;

		const length = buffer.readUInt16BE(pos + 2);
		if (length < 2) return null;

		// SOF0(ベースライン) / SOF1(拡張シーケンシャル) / SOF2(プログレッシブ)のみ採用。
		// SOF3(ロスレス)はRAWのセンサーデータ本体なので除外する。
		if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
			if (pos + 9 > buffer.length) return null;
			const height = buffer.readUInt16BE(pos + 5);
			const width = buffer.readUInt16BE(pos + 7);
			return width > 0 && height > 0 ? { width, height } : null;
		}

		pos += 2 + length;
	}

	return null;
}

/**
 * SOI位置から始まるJPEGの終端（EOI直後）を求める。
 * SOS以降のエントロピー符号化データ中では 0xFF が 0xFF00 にエスケープされるため、
 * SOS以降で最初に現れる 0xFFD9 が本物のEOIになる。
 */
function findJpegEnd(buffer: Buffer, soi: number): number {
	const limit = Math.min(buffer.length, soi + MAX_HEADER_SCAN);
	let pos = soi + 2;

	while (pos + 4 <= limit) {
		if (buffer[pos] !== 0xff) break;

		const marker = buffer[pos + 1] as number;
		if (
			marker === 0xd8 ||
			marker === 0x01 ||
			(marker >= 0xd0 && marker <= 0xd7)
		) {
			pos += 2;
			continue;
		}

		const length = buffer.readUInt16BE(pos + 2);
		if (length < 2) break;

		if (marker === 0xda) {
			const eoi = buffer.indexOf(JPEG_EOI, pos + 2 + length);
			return eoi === -1 ? buffer.length : eoi + 2;
		}

		pos += 2 + length;
	}

	return buffer.length;
}

/**
 * バッファ中の埋め込みJPEGを列挙する（大きい順）
 */
function findEmbeddedJpegs(buffer: Buffer): JpegCandidate[] {
	const candidates: JpegCandidate[] = [];
	let from = 0;

	while (candidates.length < MAX_JPEG_CANDIDATES) {
		const soi = buffer.indexOf(JPEG_SOI, from);
		if (soi === -1) break;
		from = soi + 2;

		const size = readJpegSize(buffer, soi);
		if (size) {
			candidates.push({
				offset: soi,
				end: findJpegEnd(buffer, soi),
				width: size.width,
				height: size.height,
			});
		}
	}

	return candidates.sort((a, b) => b.width * b.height - a.width * a.height);
}

/**
 * RAWファイルから埋め込みJPEGプレビューを抽出する。
 * 埋め込まれているJPEGのうち、実際にデコードできる最大のものを返す。
 */
export async function extractRawPreview(buffer: Buffer): Promise<Buffer> {
	for (const candidate of findEmbeddedJpegs(buffer)) {
		// セグメントを辿って求めた終端が正しくない場合に備え、
		// 末尾までを渡す経路もフォールバックとして試す（sharpはEOIで読み終える）。
		for (const end of [candidate.end, buffer.length]) {
			const preview = buffer.subarray(candidate.offset, end);
			try {
				const meta = await sharp(preview).metadata();
				if (meta.format === "jpeg" && meta.width && meta.height) {
					return Buffer.from(preview);
				}
			} catch {
				// このスライスはデコードできなかったので次を試す
			}
		}
	}

	throw new Error(
		"RAWファイルからプレビュー画像を抽出できませんでした。" +
			"ファイルが破損しているか、対応していないRAW形式の可能性があります。",
	);
}

// ── HEIC（iPhoneの標準形式） ──────────────────────────────────────────────
//
// sharp に同梱されている libvips は、HEIF入力のうちAV1(=AVIF)しか復号できず、
// iPhoneが撮影するHEVCコーデックのHEICはデコードできない（特許の都合で
// プリビルドにHEVCデコーダが含まれない）。
// libheif の WASM ビルド（heic-decode）で生ピクセルに展開してから sharp に渡す。

const HEIF_BRANDS = [
	"heic",
	"heix",
	"hevc",
	"hevx",
	"heim",
	"heis",
	"hevm",
	"hevs",
	"mif1",
	"msf1",
];

/** ISO BMFF の ftyp ブランドを見てHEIF系かどうか判定する */
function isHeifBuffer(buffer: Buffer): boolean {
	if (buffer.length < 12) return false;
	if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
	const brand = buffer.toString("ascii", 8, 12).replace(/\0/g, " ").trim();
	return HEIF_BRANDS.includes(brand);
}

/**
 * EXIF の Orientation を数値(1〜8)で読む。取得できなければ1（回転不要）。
 */
async function readExifOrientation(buffer: Buffer): Promise<number> {
	try {
		const { orientation } = await import("exifr");
		const value = await orientation(buffer);
		return typeof value === "number" && value >= 1 && value <= 8 ? value : 1;
	} catch {
		return 1;
	}
}

/**
 * EXIF Orientation を打ち消す回転・反転を適用する。
 * sharp は flip/flop を必ず rotate の後に適用するため、この組み合わせで正しい向きになる。
 */
function applyExifOrientation(
	image: sharp.Sharp,
	orientation: number,
): sharp.Sharp {
	switch (orientation) {
		case 2:
			return image.flop();
		case 3:
			return image.rotate(180);
		case 4:
			return image.flip();
		case 5:
			return image.rotate(90).flop();
		case 6:
			return image.rotate(90);
		case 7:
			return image.rotate(270).flop();
		case 8:
			return image.rotate(270);
		default:
			return image;
	}
}

// HEIF の回転・反転プロパティ（irot / imir）のボックス。
// どちらも「4バイトのサイズ(=9) + 4バイトの型名 + 1バイトの値」の固定長なので、
// サイズごとバイト列で探せば画素データへの誤一致はまず起きない。
const HEIF_IROT_BOX = Buffer.from([0x00, 0x00, 0x00, 0x09, 0x69, 0x72, 0x6f, 0x74]);
const HEIF_IMIR_BOX = Buffer.from([0x00, 0x00, 0x00, 0x09, 0x69, 0x6d, 0x69, 0x72]);

/**
 * HEIF が irot / imir（回転・反転の変換プロパティ）を持っているかを調べる。
 *
 * libheif はこの2つを復号時に画素へ適用して返す。つまり変換プロパティを持つファイルは
 * 展開した時点で既に正しい向きになっており、そこへ EXIF の Orientation を重ねると
 * 二重に回ってしまう。HEIF では変換プロパティ側が正であり EXIF より優先されるため、
 * 「変換プロパティが無いときだけ EXIF を見る」という判断に使う。
 *
 * テストから直接検証できるよう export している。
 */
export function hasHeifTransformProperty(buffer: Buffer): boolean {
	// 変換プロパティは meta ボックス内（iprp > ipco）にしか現れない。
	// meta が見つかればその範囲だけを見て、見つからなければ全体を対象にする。
	const metaAt = buffer.indexOf(Buffer.from("meta", "ascii"));
	const search = metaAt === -1 ? buffer : buffer.subarray(metaAt);

	return (
		search.indexOf(HEIF_IROT_BOX) !== -1 || search.indexOf(HEIF_IMIR_BOX) !== -1
	);
}

/** HEICを生ピクセルに展開して sharp のパイプラインを作る */
async function heicToSharp(buffer: Buffer): Promise<sharp.Sharp> {
	const { default: decode } = await import("heic-decode");
	const { width, height, data } = await decode({ buffer });

	const image = sharp(
		Buffer.from(data.buffer, data.byteOffset, data.byteLength),
		{
			raw: { width, height, channels: 4 },
		},
	);

	// libheif は HEIF 側の変換プロパティ(irot/imir)を展開時に画素へ適用する。
	// それを持つファイルに EXIF の Orientation を重ねて掛けると二重に回るため、
	// 変換プロパティが無いHEIC（向きの情報が EXIF にしか無いもの）だけを手当てする。
	if (hasHeifTransformProperty(buffer)) return image;

	return applyExifOrientation(image, await readExifOrientation(buffer));
}

/** リサイズしてWebPにエンコードする共通処理 */
async function toWebp(image: sharp.Sharp): Promise<Buffer> {
	return image
		.resize({
			width: 1920,
			height: 1920,
			fit: "inside",
			withoutEnlargement: true,
		})
		.webp({ quality: 80 })
		.toBuffer();
}

/**
 * ファイルサイズをチェック
 * @param size - ファイルサイズ（バイト）
 * @returns 10MB以下ならtrue
 */
export function validateFileSize(size: number): boolean {
	return size <= MAX_FILE_SIZE;
}

/**
 * RAW形式ファイルのサイズをチェック（100MBまで）
 */
export function validateRawFileSize(size: number): boolean {
	return size <= MAX_RAW_FILE_SIZE;
}

/**
 * 画像ファイルのサイズをチェック（RAWは100MB、それ以外は10MB）
 */
export function validateImageFileSize(filename: string, size: number): boolean {
	return isRawImageExtension(filename)
		? validateRawFileSize(size)
		: validateFileSize(size);
}

/** サイズ超過時のエラーメッセージ（RAWかどうかで上限が違う） */
export function imageSizeErrorMessage(filename: string): string {
	return isRawImageExtension(filename)
		? `「${filename}」のサイズが100MBを超えています。`
		: `「${filename}」のサイズが10MBを超えています。`;
}

/**
 * 複数ファイルの合計サイズと枚数をチェック
 */
export function validateMultipleFiles(files: File[]): string | null {
	if (files.length > MAX_FILE_COUNT) {
		return `ファイルは最大${MAX_FILE_COUNT}枚までです。`;
	}
	const totalSize = files.reduce((sum, f) => sum + f.size, 0);
	if (totalSize > MAX_TOTAL_SIZE) {
		return `ファイルの合計サイズは${MAX_TOTAL_SIZE / 1024 / 1024}MBまでです。`;
	}
	for (const f of files) {
		if (!validateImageFileSize(f.name, f.size)) {
			return imageSizeErrorMessage(f.name);
		}
	}
	return null; // エラーなし
}

/**
 * 画像をWebP形式に変換・圧縮
 * @param buffer - 元の画像データ
 * @returns 圧縮後のBufferとContent-Type
 */
export async function compressImage(
	buffer: Buffer,
): Promise<{ data: Buffer; contentType: string; extension: string }> {
	let data: Buffer;

	try {
		// .rotate() は引数なしでEXIF Orientationを実ピクセルに焼き込む。
		// WebPはOrientationを保持しないため、これを省くと縦位置写真が横倒しで保存される。
		data = await toWebp(sharp(buffer).rotate());
	} catch {
		if (!isHeifBuffer(buffer)) {
			throw new Error(
				"画像のWebP変換に失敗しました。対応していない画像形式の可能性があります。",
			);
		}
		// sharpが復号できないHEVCのHEIC。libheif(WASM)で展開してから変換し直す。
		try {
			data = await toWebp(await heicToSharp(buffer));
		} catch {
			throw new Error(
				"HEIC画像の変換に失敗しました。ファイルが破損している可能性があります。",
			);
		}
	}

	return {
		data,
		contentType: "image/webp",
		extension: "webp",
	};
}

/**
 * アップロードされた画像を、形式に応じた前処理つきでWebPに変換する。
 * RAWは埋め込みプレビューを抽出してから変換する。
 * @param buffer - アップロードされたファイルの中身
 * @param filename - 形式判定に使うファイル名
 */
export async function compressUploadedImage(
	buffer: Buffer,
	filename: string,
): Promise<{ data: Buffer; contentType: string; extension: string }> {
	const source = isRawImageExtension(filename)
		? await extractRawPreview(buffer)
		: buffer;
	return compressImage(source);
}

/**
 * 動画を圧縮（MP4形式）
 * @param inputBuffer - 元の動画データ
 * @returns 圧縮後のBufferとContent-Type
 */
export async function compressVideo(
	inputBuffer: Buffer,
): Promise<{ data: Buffer; contentType: string; extension: string }> {
	// 一時ファイルに書き出してFFmpegで処理
	const tempId = randomUUID();
	const inputPath = join(tmpdir(), `input_${tempId}.mp4`);
	const outputPath = join(tmpdir(), `output_${tempId}.mp4`);

	await writeFile(inputPath, inputBuffer);

	return new Promise((resolve, reject) => {
		ffmpeg(inputPath)
			.outputOptions([
				"-c:v libx264",
				"-crf 28",
				"-preset fast",
				"-c:a aac",
				"-b:a 128k",
				"-movflags +faststart",
			])
			.output(outputPath)
			.on("end", async () => {
				try {
					const { readFile } = await import("node:fs/promises");
					const data = await readFile(outputPath);
					// 一時ファイルを削除
					await unlink(inputPath).catch(() => {});
					await unlink(outputPath).catch(() => {});
					resolve({
						data: Buffer.from(data),
						contentType: "video/mp4",
						extension: "mp4",
					});
				} catch (err) {
					reject(err);
				}
			})
			.on("error", async (err) => {
				// 一時ファイルを削除
				await unlink(inputPath).catch(() => {});
				await unlink(outputPath).catch(() => {});
				reject(err);
			})
			.run();
	});
}

/**
 * XSS対策：HTMLタグを無害化
 * 設計書のバリデーションルールに「XSS対策」が明記されているため実装
 */
export function sanitizeHtml(input: string): string {
	return input
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#x27;");
}
