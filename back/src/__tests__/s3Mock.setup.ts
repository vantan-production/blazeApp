// S3への実アクセスを防ぐグローバルモック。
// isolate:false でモジュールキャッシュが全テストファイル間で共有されるため、
// 個別のテストファイル内でvi.mockしても、それより先に評価される他ファイル
// （例: achievement.test.ts）が未モックのdb/s3.jsを先に読み込んでしまうと
// 効かなくなる。setupFilesとして全テストファイルより前に登録することで防ぐ。
import { vi } from "vitest";

vi.mock("../db/s3.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/s3.js")>();
  const sharp = (await import("sharp")).default;

  // モザイクのテストが 20×20 の領域を切り出すため、それより大きい画像にする
  let cached: Buffer | undefined;
  const samplePng = async (): Promise<Buffer> => {
    cached ??= await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 200, g: 30, b: 30 },
      },
    })
      .png()
      .toBuffer();
    return cached;
  };

  return {
    ...actual,
    uploadToS3: vi.fn(async () => {}),
    deleteFromS3: vi.fn(async () => {}),
    // 空バッファだと sharp が「Input Buffer is empty」で落ちるため、
    // モザイク処理など画像を読み込む経路のために実際に読める PNG を返す。
    // 生成コストを避けて初回だけ作り、以降は使い回す。
    downloadFromS3: vi.fn(async () => samplePng()),
    getPresignedDownloadUrl: vi.fn(
      async (key: string) => `https://mock-s3.test/${key}`,
    ),
  };
});
