// 実カメラRAW・実動画・実HEIC・実EXIF付きJPEGを通した変換パイプラインのE2E。
//
// mediaPipeline.test.ts は合成画像と組み立てたバッファで分岐を検証する。
// こちらは「実際のカメラ・スマホが吐いたファイル」だけを使い、
// 変換後のバイト列とAPIの応答を検証する。
//
// 変換結果のバイト列は compressUploadedImage / compressVideo の戻り値から直接得る。
// S3モック（s3Mock.setup.ts）の呼び出し履歴は、isolate:false のモジュール共有の都合で
// テストファイル側とハンドラ側が別インスタンスを掴むことがあり、履歴に頼ると不安定になる。
//
// フィクスチャ（合計約200MB）はリポジトリに含めないため、事前に取得が必要：
//   npm run fixtures:media
// 未取得の場合、このファイルのテストはスキップされる。

import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../app.js";
import { compressUploadedImage, compressVideo } from "../utils/media.js";
import {
	processImageUpload,
	processVideoUpload,
} from "../utils/mediaHandler.js";
import {
	fixtureFile,
	fixturesAvailable,
	loadFixture,
} from "./fixtures/mediaFixtures.js";
import { cleanDb } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";

const D = "@mediaRealFiles.test";
const ORIGIN = "http://localhost:3000";

const available = await fixturesAvailable();
const describeReal = available ? describe : describe.skip;

if (!available) {
	console.warn(
		"[mediaRealFiles] 実メディアフィクスチャが未取得のためスキップします。`npm run fixtures:media` を実行してください。",
	);
}

/** 実ファイルを読み込んで、アップロード時と同じ経路でWebPに変換する */
async function convertFixture(file: string) {
	const buffer = await loadFixture(file);
	return compressUploadedImage(buffer, file);
}

// アプリが RAW_IMAGE_EXTENSIONS で受け付けると宣言している6形式すべて
const RAW_FIXTURES = [
	"real.cr3",
	"real.cr2",
	"real.arw",
	"real.nef",
	"real.raf",
	"real.dng",
];

describeReal("実カメラRAW → WebP 変換", () => {
	it.each(RAW_FIXTURES)(
		"%s がWebPに変換される",
		async (file) => {
			const result = await convertFixture(file);

			expect(result.contentType).toBe("image/webp");
			expect(result.extension).toBe("webp");
			const meta = await sharp(result.data).metadata();
			expect(meta.format).toBe("webp");
		},
		60000,
	);

	it.each(RAW_FIXTURES)(
		"%s の変換結果は掲載に耐える解像度になる（サムネイルに縮退していない）",
		async (file) => {
			const result = await convertFixture(file);
			const meta = await sharp(result.data).metadata();

			// compressImage は長辺1920に収める設計。実カメラRAWには必ず
			// 1000px超の埋め込みプレビューがあるため、それを下回るのは
			// 埋め込みサムネイル(160x120等)を掴んでいる証拠。
			expect(
				Math.max(meta.width ?? 0, meta.height ?? 0),
			).toBeGreaterThanOrEqual(1000);
		},
		60000,
	);

	it.each(RAW_FIXTURES)(
		"%s はアップロードAPIを通しても成功する",
		async (file) => {
			const result = await processImageUpload(
				await fixtureFile(file),
				"test/raw",
			);
			expect(result).toMatchObject({ success: true });
		},
		60000,
	);
});

describeReal("実RAWのファイルサイズ上限", () => {
	it("64MBの実CR2はRAW上限100MB以内なので変換される", async () => {
		const buf = await loadFixture("real.cr2");
		// フルサイズ機のCR2は50MBを超える。上限が50MBのままだと実ファイルが通らない
		expect(buf.length).toBeGreaterThan(50 * 1024 * 1024);
		expect(buf.length).toBeLessThan(100 * 1024 * 1024);

		const result = await processImageUpload(
			await fixtureFile("real.cr2"),
			"test/raw",
		);

		expect(result).toMatchObject({ success: true });
	}, 60000);

	it("RAW上限100MBを超えるファイルは400で拒否される", async () => {
		// 実ファイルで100MB超を用意するのは重いので、サイズだけ偽装したFileで境界を確認する
		const oversized = {
			name: "huge.cr2",
			size: 100 * 1024 * 1024 + 1,
			arrayBuffer: async () => new ArrayBuffer(0),
		} as unknown as File;

		const result = await processImageUpload(oversized, "test/raw");

		expect(result).toMatchObject({ success: false, status: 400 });
	}, 60000);

	it("RAW以外の画像は従来どおり10MBを超えると拒否される", async () => {
		const oversized = {
			name: "huge.png",
			size: 10 * 1024 * 1024 + 1,
			arrayBuffer: async () => new ArrayBuffer(0),
		} as unknown as File;

		const result = await processImageUpload(oversized, "test/img");

		expect(result).toMatchObject({ success: false, status: 400 });
	}, 60000);
});

describeReal("実HEIC（iPhone実機の標準形式）", () => {
	it("HEICがWebPに変換される", async () => {
		const result = await convertFixture("real.heic");

		const meta = await sharp(result.data).metadata();
		expect(meta.format).toBe("webp");
		// sharp単体では復号できないHEVCのHEIC。libheif経由で実画素まで展開できている
		expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeGreaterThanOrEqual(
			1000,
		);
	}, 60000);

	it("HEICはアップロードAPIを通しても成功する", async () => {
		const result = await processImageUpload(
			await fixtureFile("real.heic", "image/heic"),
			"test/heic",
		);
		expect(result).toMatchObject({ success: true });
	}, 60000);
});

describeReal("実EXIF付きJPEG", () => {
	it("EXIF Orientation=6 の縦位置写真は縦向きに変換される", async () => {
		const src = await sharp(await loadFixture("real_orient6.jpg")).metadata();
		// 元ファイルはピクセル上は横長で、Orientation=6（時計回り90度）で縦位置として表示される
		expect(src.orientation).toBe(6);
		expect(src.width).toBeGreaterThan(src.height ?? 0);

		const result = await convertFixture("real_orient6.jpg");
		const meta = await sharp(result.data).metadata();

		// WebPは表示時にOrientationを解釈しないため、変換時に回転を焼き込む必要がある
		expect(meta.height).toBeGreaterThan(meta.width ?? 0);
	}, 60000);

	it("回転不要な実JPEGはそのままの向きでWebPに変換される", async () => {
		const result = await convertFixture("real_canon.jpg");
		const meta = await sharp(result.data).metadata();

		expect(meta.format).toBe("webp");
		expect(meta.width).toBe(100);
		expect(meta.height).toBe(68);
	}, 60000);
});

describeReal("実動画 → MP4 圧縮", () => {
	it.each(["real.mp4", "real.mov"])(
		"%s がMP4に再エンコードされる",
		async (file) => {
			const source = await loadFixture(file);
			const result = await compressVideo(source);

			expect(result.contentType).toBe("video/mp4");
			// MP4コンテナのシグネチャ（ftypボックス）
			expect(result.data.subarray(4, 8).toString("ascii")).toBe("ftyp");
			// 再エンコードで実際に小さくなっていること（＝入力をそのまま返していない）
			expect(result.data.length).toBeLessThan(source.length);
		},
		120000,
	);

	it.each(["real.mp4", "real.mov"])(
		"%s はアップロードAPIを通しても成功する",
		async (file) => {
			const result = await processVideoUpload(
				await fixtureFile(file),
				"test/video",
			);
			expect(result).toMatchObject({ success: true });
		},
		120000,
	);
});

describeReal("HTTP経由のE2E（POST /api/gameImg）", () => {
	// 認証APIのレートリミット状態を持ち越さないよう、テストごとにDBとRedisを掃除する
	beforeEach(async () => {
		await cleanDb();
	});

	it("実カメラRAWをフォーム送信すると投稿が作成される", async () => {
		const cookie = await registerAndLogin("Owner", `owner-raw${D}`);

		const fd = new FormData();
		fd.append("image", await fixtureFile("real.cr3"));

		const res = await app.request("/api/gameImg", {
			method: "POST",
			headers: { Cookie: cookie, Origin: ORIGIN },
			body: fd,
		});

		expect(res.status).toBe(200);
	}, 60000);

	it("実HEICをフォーム送信すると投稿が作成される", async () => {
		const cookie = await registerAndLogin("Owner", `owner-heic${D}`);

		const fd = new FormData();
		fd.append("image", await fixtureFile("real.heic", "image/heic"));

		const res = await app.request("/api/gameImg", {
			method: "POST",
			headers: { Cookie: cookie, Origin: ORIGIN },
			body: fd,
		});

		expect(res.status).toBe(200);
	}, 60000);

	it("実JPEGをフォーム送信すると投稿が作成される（比較対象）", async () => {
		const cookie = await registerAndLogin("Owner", `owner-jpg${D}`);

		const fd = new FormData();
		fd.append("image", await fixtureFile("real_canon.jpg", "image/jpeg"));

		const res = await app.request("/api/gameImg", {
			method: "POST",
			headers: { Cookie: cookie, Origin: ORIGIN },
			body: fd,
		});

		expect(res.status).toBe(200);
	}, 60000);
});

describeReal("RAWのサイズ判定がエンドポイント間で食い違っていないこと", () => {
	beforeEach(async () => {
		await cleanDb();
	});

	// media.ts は RAW に100MB枠を用意している。gameImg/create.ts が
	// 一律10MB判定のままだと、実カメラRAWは拡張子が許可されていても必ず弾かれる。
	it("mediaHandler が受け付けるRAWは gameImg でも受け付けられる", async () => {
		const cookie = await registerAndLogin("Owner", `owner-size${D}`);

		const viaHandler = await processImageUpload(
			await fixtureFile("real.arw"),
			"test/raw",
		);
		expect(viaHandler).toMatchObject({ success: true });

		const fd = new FormData();
		fd.append("image", await fixtureFile("real.arw"));
		const res = await app.request("/api/gameImg", {
			method: "POST",
			headers: { Cookie: cookie, Origin: ORIGIN },
			body: fd,
		});

		expect(res.status).toBe(200);
	}, 60000);
});
