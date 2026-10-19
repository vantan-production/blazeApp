// S3 の認証情報（src/db/s3.ts の buildS3Credentials）のテスト。
// 本番はアクセスキーを渡さず ECS タスクロールで動かすため、キーが無いときに
// 空文字のキーを明示指定して既定の認証情報チェーンを潰さないことを確かめる。

import { describe, expect, it } from "vitest";
import { buildS3Credentials } from "../db/s3.js";

describe("buildS3Credentials", () => {
  it("キーとシークレットがそろっていれば明示指定する", () => {
    expect(
      buildS3Credentials({ AWS_ACCESS_KEY_ID: "AKIA_TEST", AWS_SECRET_ACCESS_KEY: "secret" }),
    ).toEqual({ accessKeyId: "AKIA_TEST", secretAccessKey: "secret" });
  });

  it("どちらも無ければ undefined（タスクロールなど既定の認証情報に任せる）", () => {
    expect(buildS3Credentials({})).toBeUndefined();
  });

  it("片方だけ・空文字のときも undefined にする", () => {
    expect(buildS3Credentials({ AWS_ACCESS_KEY_ID: "AKIA_TEST" })).toBeUndefined();
    expect(
      buildS3Credentials({ AWS_ACCESS_KEY_ID: "", AWS_SECRET_ACCESS_KEY: "" }),
    ).toBeUndefined();
  });
});
