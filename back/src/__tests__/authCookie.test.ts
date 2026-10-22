// 認証 Cookie の Domain 属性のテスト
//
// front（www）と API（api）が別ホストの本番では、Domain を付けないと front のサーバー側から
// Cookie が読めずログイン状態を確認できない。COOKIE_DOMAIN の有無で属性が切り替わることを確認する。

import { afterEach, describe, expect, it, vi } from "vitest";
import { clearedTokenCookie, tokenCookie } from "../utils/authCookie.js";

describe("authCookie", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("COOKIE_DOMAIN 未指定なら Domain を付けない（API ホスト専用）", () => {
    vi.stubEnv("COOKIE_DOMAIN", "");
    expect(tokenCookie("abc")).toBe(
      "token=abc; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000",
    );
    expect(clearedTokenCookie()).toBe(
      "token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
    );
  });

  it("COOKIE_DOMAIN を指定すると発行・削除の両方に同じ Domain が付く", () => {
    vi.stubEnv("COOKIE_DOMAIN", "example.com");
    expect(tokenCookie("abc")).toContain("; Domain=example.com;");
    expect(clearedTokenCookie()).toContain("; Domain=example.com;");
  });
});
