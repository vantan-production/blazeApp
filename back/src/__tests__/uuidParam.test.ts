// 不正な形式のID（UUIDでない値）をパスに渡したときの挙動テスト
//
// 以前は "abc" のような値がそのまま WHERE に渡り、Postgres の uuid キャストに失敗して 500 になっていた。
// DBに問い合わせる前に弾き、存在しないIDと同じ 404 を返すことを確認する。

import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../app.js";
import { isUuid } from "../utils/uuidParam.js";
import { cleanDb } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";

const D = "@uuidParam.test";
const ORIGIN = "http://localhost:3000";
const VALID_ID = "00000000-0000-0000-0000-000000000000";

beforeEach(async () => {
  await cleanDb();
});

describe("isUuid", () => {
  it("8-4-4-4-12 桁の16進数だけを受け付ける", () => {
    expect(isUuid(VALID_ID)).toBe(true);
    expect(isUuid("3F2504E0-4F89-11D3-9A0C-0305E82C3301")).toBe(true);
    expect(isUuid("abc")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(`${VALID_ID}0`)).toBe(false);
    expect(isUuid("00000000000000000000000000000000")).toBe(false);
    expect(isUuid("gggggggg-0000-0000-0000-000000000000")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

async function expectNotFound(res: Response) {
  expect(res.status).toBe(404);
  const body = (await res.json()) as { success: boolean; errors: string };
  expect(body.success).toBe(false);
  expect(body.errors).toBeTruthy();
}

describe("公開API（crudRouter）の不正なID", () => {
  for (const base of ["/api/news-post", "/api/media", "/api/achievement", "/api/gameImg"]) {
    it(`GET ${base}/abc は 404`, async () => {
      await expectNotFound(await app.request(`${base}/abc`));
    });
  }

  it("PATCH / DELETE も 404（owner）", async () => {
    const cookie = await registerAndLogin("Owner", `owner1${D}`);
    const headers = { Cookie: cookie, Origin: ORIGIN };

    for (const base of ["/api/news-post", "/api/media", "/api/achievement"]) {
      await expectNotFound(
        await app.request(`${base}/abc`, { method: "PATCH", headers, body: new FormData() }),
      );
      await expectNotFound(await app.request(`${base}/abc`, { method: "DELETE", headers }));
    }
    await expectNotFound(await app.request("/api/gameImg/abc", { method: "DELETE", headers }));
    // gameImg の PATCH は /:id/:imageId。どちらのパラメータが不正でも 404
    await expectNotFound(
      await app.request(`/api/gameImg/abc/${VALID_ID}`, { method: "PATCH", headers, body: new FormData() }),
    );
    await expectNotFound(
      await app.request(`/api/gameImg/${VALID_ID}/abc`, { method: "PATCH", headers, body: new FormData() }),
    );
  });

  it("未ログインの DELETE は ID の形式より先に 401 を返す", async () => {
    const res = await app.request("/api/news-post/abc", {
      method: "DELETE",
      headers: { Origin: ORIGIN },
    });
    expect(res.status).toBe(401);
  });

  it("member の DELETE は ID の形式より先に 403 を返す", async () => {
    await registerAndLogin("Owner", `owner2${D}`);
    const memberCookie = await registerAndLogin("Member", `member2${D}`);
    const res = await app.request("/api/news-post/abc", {
      method: "DELETE",
      headers: { Cookie: memberCookie, Origin: ORIGIN },
    });
    expect(res.status).toBe(403);
  });
});

describe("個別ルーターの不正なID（owner）", () => {
  const cases: Array<[method: string, path: string]> = [
    ["GET", "/api/inquiry/abc"],
    ["PATCH", "/api/inquiry/abc/status"],
    ["POST", "/api/inquiry/abc/reply"],
    ["DELETE", `/api/inquiry/${VALID_ID}/reply/abc`],
    ["GET", "/api/trial-application/abc"],
    ["GET", "/api/notices/abc"],
    ["GET", "/api/notices/abc/reads"],
    ["POST", "/api/notices/abc/read"],
    ["PATCH", "/api/notices/abc"],
    ["DELETE", "/api/notices/abc"],
    ["GET", "/api/surveys/abc"],
    ["POST", "/api/surveys/abc/responses"],
    ["GET", "/api/surveys/abc/results"],
    ["GET", "/api/surveys/abc/pending"],
    ["PATCH", "/api/surveys/abc"],
    ["DELETE", "/api/surveys/abc"],
    ["GET", "/api/documents/abc/download"],
    ["PATCH", "/api/documents/abc"],
    ["DELETE", "/api/documents/abc"],
    ["PATCH", "/api/consent-requests/abc"],
    ["GET", "/api/members/gallery/abc/download"],
    ["PATCH", "/api/submissions/abc/approve"],
    ["PATCH", "/api/submissions/abc/reject"],
    ["PATCH", "/api/gameImg/images/abc/consent"],
    ["POST", "/api/gameImg/images/abc/mosaic"],
    ["DELETE", "/api/admin/invitations/abc"],
    ["PATCH", "/api/admin/users/abc/role"],
    ["POST", "/api/admin/users/abc/delete-request"],
    ["POST", "/api/admin/delete-requests/abc/approve"],
    ["DELETE", "/api/admin/delete-requests/abc"],
  ];

  it.each(cases)("%s %s は 404", async (method, path) => {
    const cookie = await registerAndLogin("Owner", `owner3${D}`);
    const headers: Record<string, string> = { Cookie: cookie, Origin: ORIGIN };
    const init: RequestInit = { method, headers };
    if (method !== "GET" && method !== "DELETE") {
      headers["Content-Type"] = "application/json";
      init.body = "{}";
    }
    await expectNotFound(await app.request(path, init));
  });
});
