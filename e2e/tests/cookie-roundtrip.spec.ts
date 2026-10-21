// 実ブラウザによる Cookie 往復の E2E
//
// ■ なぜこのファイルが必要なのか
// back/src/__tests__ のテストは Set-Cookie を正規表現で切り出し、手で Cookie ヘッダに
// 詰め直している（testHelpers.ts の extractCookie）。属性の解釈をテスト側が肩代わり
// しているため、以下を壊しても既存の全テストが通ってしまう。
//   - HttpOnly を外す      → XSS でトークンを盗めるようになる
//   - SameSite を None にする → CSRF に対して無防備になる
//   - Path を /api に変える   → ログアウトで Cookie が消えなくなる
// ここでは Cookie をブラウザの保管庫に預け、送るかどうかの判断を全てブラウザに委ねる。
// テスト側が Cookie ヘッダを組み立てたら、このテストは意味を失う。

import { test, expect } from "@playwright/test";
import { APP_ORIGIN, EVIL_ORIGIN, OWNER, apiFetch, tokenCookie } from "./fixtures.js";

/** ログイン（Cookie の保存はブラウザに任せる） */
const login = (page: import("@playwright/test").Page) =>
  apiFetch(page, "/api/admin/login", {
    method: "POST",
    body: { email: OWNER.email, password: OWNER.password },
  });

test.beforeEach(async ({ page, context }) => {
  // 前のテストの Cookie を持ち越さない
  await context.clearCookies();
  await page.goto(APP_ORIGIN);
});

// ---------------------------------------------------------------------------

test.describe("ログインで発行される Cookie", () => {
  test("ブラウザが Cookie を受け入れ、属性どおりに保存する", async ({ page }) => {
    const res = await login(page);
    expect(res.status).toBe(200);

    // ここが「アプリ内リクエスト」では検証できない部分。
    // ブラウザが Set-Cookie を解釈して保管庫に入れたという事実そのものを見ている。
    // 属性が不正な Cookie はブラウザが黙って捨てるため、存在すること自体が検証になる
    const token = await tokenCookie(page);
    expect(token, "token Cookie がブラウザに保存されていない").toBeDefined();

    expect(token!.httpOnly, "HttpOnly が失われている（XSSでトークンを盗める）").toBe(true);
    expect(token!.sameSite, "SameSite が Strict でない（CSRFに無防備）").toBe("Strict");
    expect(token!.secure, "Secure が失われている（平文HTTPでトークンが流れる）").toBe(true);
    // Path が狭いとログアウト時の削除 Cookie が一致せず、消し損ねる
    expect(token!.path).toBe("/");
    // セッション Cookie（expires=-1）になっていないこと。ブラウザを閉じると即ログアウトになる
    expect(token!.expires).toBeGreaterThan(Date.now() / 1000);

    // レスポンスボディにトークンを載せていないこと
    expect(JSON.stringify(res.body)).not.toContain(token!.value);
  });

  test("JavaScript から Cookie を読めない（HttpOnly が実際に効いている）", async ({ page }) => {
    await login(page);

    // XSS が起きた場合に攻撃者のスクリプトが実行する操作を、そのまま再現する
    const visibleToScript = await page.evaluate(() => document.cookie);
    expect(visibleToScript).not.toContain("token");
  });
});

// ---------------------------------------------------------------------------

test.describe("Cookie の送り返し", () => {
  test("Cookie ヘッダを自分で付けなくても認証が通る", async ({ page }) => {
    await login(page);

    // Cookie ヘッダは一切指定していない。ブラウザが保管庫から自動で載せている
    const me = await apiFetch(page, "/api/admin/me");
    expect(me.status).toBe(200);
    expect((me.body as { data: { email: string } }).data.email).toBe(OWNER.email);
  });

  test("credentials を omit にすると 401（上の成功が本当に Cookie のおかげだと確認する）", async ({
    page,
  }) => {
    await login(page);

    // front/lib/apiClient.ts が credentials:"include" を落とした場合に起きること。
    // この対照実験が無いと、上のテストは「認証が無くても200を返している」可能性を排除できない
    const me = await apiFetch(page, "/api/admin/me", { credentials: "omit" });
    expect(me.status).toBe(401);
  });

  test("ページを再読み込みしてもログイン状態が続く", async ({ page }) => {
    await login(page);
    await page.reload();

    const me = await apiFetch(page, "/api/admin/me");
    expect(me.status).toBe(200);
  });

  test("同じブラウザの別タブでもログイン状態が共有される", async ({ page, context }) => {
    await login(page);

    const anotherTab = await context.newPage();
    await anotherTab.goto(APP_ORIGIN);
    const me = await apiFetch(anotherTab, "/api/admin/me");
    expect(me.status).toBe(200);
    await anotherTab.close();
  });
});

// ---------------------------------------------------------------------------

test.describe("クロスサイトからのアクセス（SameSite=Strict の実効性）", () => {
  test("別サイトのページからは Cookie が送られない", async ({ page }) => {
    // まずアプリのオリジンでログインし、Cookie をブラウザに持たせる
    await login(page);
    expect(await tokenCookie(page)).toBeDefined();

    // 攻撃者サイトに移動する。Cookie はブラウザに残っているが、
    // localhost とは別サイトなので SameSite=Strict により送信されない
    await page.goto(EVIL_ORIGIN);
    const me = await apiFetch(page, "/api/admin/me");

    expect(
      me.status,
      "クロスサイトのページから Cookie が送られている。SameSite=Strict が効いていない",
    ).toBe(401);

    // Cookie 自体は消えていない（送られなかっただけ）ことを確認する。
    // これを見ないと「ログアウトされていただけ」と区別がつかない
    expect(await tokenCookie(page)).toBeDefined();
  });

  test("アプリのオリジンに戻れば再び Cookie が送られる", async ({ page }) => {
    await login(page);
    await page.goto(EVIL_ORIGIN);
    expect((await apiFetch(page, "/api/admin/me")).status).toBe(401);

    await page.goto(APP_ORIGIN);
    expect((await apiFetch(page, "/api/admin/me")).status).toBe(200);
  });
});

// ---------------------------------------------------------------------------

test.describe("ログアウト", () => {
  test("ブラウザの保管庫から Cookie が消え、以降のアクセスが 401 になる", async ({ page }) => {
    await login(page);
    expect(await tokenCookie(page)).toBeDefined();

    const logout = await apiFetch(page, "/api/admin/logout", { method: "POST" });
    expect(logout.status).toBe(200);

    // 削除用の Set-Cookie（Max-Age=0）をブラウザが解釈して消したことの確認。
    // Path や属性が発行時と食い違っていると、ここで Cookie が残る
    expect(
      await tokenCookie(page),
      "ログアウトしたのに Cookie がブラウザに残っている（共用端末で次の人がログイン状態になる）",
    ).toBeUndefined();

    expect((await apiFetch(page, "/api/admin/me")).status).toBe(401);
  });

  test("ログアウト後に再ログインできる", async ({ page }) => {
    await login(page);
    await apiFetch(page, "/api/admin/logout", { method: "POST" });

    expect((await login(page)).status).toBe(200);
    expect((await apiFetch(page, "/api/admin/me")).status).toBe(200);
  });
});

// ---------------------------------------------------------------------------

test.describe("認証の失敗", () => {
  test("パスワードを間違えると Cookie は発行されない", async ({ page }) => {
    const res = await apiFetch(page, "/api/admin/login", {
      method: "POST",
      body: { email: OWNER.email, password: "Wrong@Password1!" },
    });
    expect(res.status).toBe(401);
    expect(await tokenCookie(page)).toBeUndefined();
  });

  test("偽造した Cookie では認証が通らない", async ({ page, context }) => {
    // 攻撃者が token の値を推測した場合を再現する
    await context.addCookies([
      {
        name: "token",
        value: "a".repeat(64),
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
      },
    ]);

    const me = await apiFetch(page, "/api/admin/me");
    expect(me.status).toBe(401);
  });
});
