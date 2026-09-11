// 実RAW・実動画・実HEIC のテストフィクスチャをダウンロードする。
//
// これらは合計200MB近い実カメラファイルのためリポジトリには含めない（.gitignore 済み）。
// mediaRealFiles.test.ts は本スクリプトで取得したファイルが無い場合スキップされる。
//
//   npm run fixtures:media
//
// 取得元はいずれも再配布可能な公開サンプル：
//   - raw.pixls.us … CC0 のカメラRAWアーカイブ
//   - filesamples.com … 公開サンプルメディア
//   - github.com/MikeKovarik/exifr, ianare/exif-samples … OSSのテストフィクスチャ

import { mkdir, stat, writeFile } from "node:fs/promises";
import {
	FIXTURE_DIR,
	MEDIA_FIXTURES,
} from "../src/__tests__/fixtures/mediaFixtures.js";

async function exists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

async function main(): Promise<void> {
	await mkdir(FIXTURE_DIR, { recursive: true });

	for (const fixture of MEDIA_FIXTURES) {
		const dest = `${FIXTURE_DIR}/${fixture.file}`;
		if (await exists(dest)) {
			console.log(`skip (取得済み): ${fixture.file}`);
			continue;
		}

		process.stdout.write(`fetch: ${fixture.file} … `);
		const res = await fetch(fixture.url);
		if (!res.ok) {
			console.log(`FAILED (${res.status})`);
			continue;
		}
		const buf = Buffer.from(await res.arrayBuffer());
		await writeFile(dest, buf);
		console.log(`${(buf.length / 1024 / 1024).toFixed(1)}MB`);
	}
}

await main();
