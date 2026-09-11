// 実メディアフィクスチャの定義と読み込みヘルパー。
// 実ファイル本体は scripts/fetchMediaFixtures.ts で取得する（リポジトリには含めない）。

import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const FIXTURE_DIR = join(
	dirname(fileURLToPath(import.meta.url)),
	"media",
);

export type MediaFixture = {
	/** 保存ファイル名（拡張子はアプリの判定に使われるため実形式と一致させる） */
	file: string;
	url: string;
	/** 何を検証するためのファイルか */
	note: string;
};

export const MEDIA_FIXTURES: MediaFixture[] = [
	{
		file: "real.cr3",
		url: "https://raw.pixls.us/data/Canon/Canon%20EOS%20M200/_MG_2231.CR3",
		note: "Canon EOS M200 の実CR3（現行Canon機の標準形式）",
	},
	{
		file: "real.cr2",
		url: "https://filesamples.com/samples/image/cr2/sample1.cr2",
		note: "Canon の実CR2（旧世代一眼レフ形式・64MB）",
	},
	{
		file: "real.arw",
		url: "https://raw.pixls.us/data/SONY/ZV-E10M2/DSC00696.ARW",
		note: "Sony ZV-E10 II の実ARW",
	},
	{
		file: "real.nef",
		url: "https://raw.pixls.us/data/NIKON%20CORPORATION/NIKON%20D5300/DSC_0090-12bit-uncompressed.NEF",
		note: "Nikon D5300 の実NEF",
	},
	{
		file: "real.raf",
		url: "https://raw.pixls.us/data/FUJIFILM/X-M5/DSCF0622_-_compressed.RAF",
		note: "Fujifilm X-M5 の実RAF",
	},
	{
		file: "real.dng",
		url: "https://raw.pixls.us/data/Adobe%20DNG%20Converter/Canon%20EOS%205D%20Mark%20III/5G4A9394-compressed-lossless.DNG",
		note: "Adobe DNG Converter が出力した実DNG",
	},
	{
		file: "real.heic",
		url: "https://raw.githubusercontent.com/MikeKovarik/exifr/master/test/fixtures/heic-iphone7.heic",
		note: "iPhone 7 が撮影した実HEIC（HEVCコーデック）",
	},
	{
		file: "real.mp4",
		url: "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
		note: "実MP4（H.264/AAC）",
	},
	{
		file: "real.mov",
		url: "https://filesamples.com/samples/video/mov/sample_640x360.mov",
		note: "実MOV（QuickTimeコンテナ）",
	},
	{
		file: "real_orient6.jpg",
		url: "https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/orientation/portrait_6.jpg",
		note: "EXIF Orientation=6（90度回転が必要）の実JPEG",
	},
	{
		file: "real_canon.jpg",
		url: "https://raw.githubusercontent.com/ianare/exif-samples/master/jpg/Canon_40D.jpg",
		note: "Canon EOS 40D の実JPEG（EXIF付き・回転不要）",
	},
];

/** フィクスチャが未取得ならテストをスキップするための判定 */
export async function fixturesAvailable(): Promise<boolean> {
	try {
		await Promise.all(
			MEDIA_FIXTURES.map((f) => stat(join(FIXTURE_DIR, f.file))),
		);
		return true;
	} catch {
		return false;
	}
}

export async function loadFixture(file: string): Promise<Buffer> {
	return readFile(join(FIXTURE_DIR, file));
}

/** アップロードAPIに渡す File を実ファイルから組み立てる */
export async function fixtureFile(file: string, type = ""): Promise<File> {
	const buf = await loadFixture(file);
	return new File([new Uint8Array(buf)], file, { type });
}
