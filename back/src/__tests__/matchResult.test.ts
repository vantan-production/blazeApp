// 試合結果API 統合テスト

import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { cleanDb } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";

const D = "@match.test";

beforeEach(async () => {
  await cleanDb();
});

const setupOwner = () => registerAndLogin("Owner", `owner${D}`);

const json = (cookie: string) => ({
  "Content-Type": "application/json",
  Cookie: cookie,
});

const validBody = {
  tournament_name: "西尾市長杯ドッジボール大会",
  tournament_result: "ベスト8",
  played_on: "2026-10-04",
  opponent_name: "元江別レッド・ソルジャー",
  our_score: 9,
  opponent_score: 8,
};

type MatchResult = typeof validBody & {
  id: string;
  tournament_result: string | null;
  admin_name: string;
};

async function create(cookie: string, overrides: Record<string, unknown> = {}) {
  const res = await app.request("/api/match-results", {
    method: "POST",
    headers: json(cookie),
    body: JSON.stringify({ ...validBody, ...overrides }),
  });
  if (res.status !== 200) {
    throw new Error(`create failed: ${res.status} ${await res.text()}`);
  }
  return ((await res.json()) as { data: MatchResult }).data;
}

describe("POST /api/match-results", () => {
  it("admin 以上は登録でき、未ログインでも一覧・詳細を見られる", async () => {
    const cookie = await setupOwner();
    const created = await create(cookie);
    expect(created.tournament_result).toBe("ベスト8");

    const list = await app.request("/api/match-results");
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as {
      data: MatchResult[];
      pagination: { total: number };
    };
    expect(listBody.pagination.total).toBe(1);
    expect(listBody.data[0]).toMatchObject({ ...validBody, admin_name: "Owner" });

    const detail = await app.request(`/api/match-results/${created.id}`);
    expect(detail.status).toBe(200);
  });

  it("大会成績は省略・空文字なら null で保存する", async () => {
    const cookie = await setupOwner();
    expect((await create(cookie, { tournament_result: undefined })).tournament_result).toBeNull();
    expect((await create(cookie, { tournament_result: "" })).tournament_result).toBeNull();
  });

  it("未ログインは 401、member は 403", async () => {
    await setupOwner();
    const anon = await app.request("/api/match-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });
    expect(anon.status).toBe(401);

    const member = await registerAndLogin("Member", `member${D}`);
    const res = await app.request("/api/match-results", {
      method: "POST",
      headers: json(member),
      body: JSON.stringify(validBody),
    });
    expect(res.status).toBe(403);
  });

  it.each([
    ["大会名が空", { tournament_name: "" }],
    ["対戦相手が空", { opponent_name: "  " }],
    ["得点がマイナス", { our_score: -1 }],
    ["得点が小数", { opponent_score: 1.5 }],
    ["得点が上限超え", { our_score: 1000 }],
    ["得点が文字列", { our_score: "9" }],
    ["試合日の形式違い", { played_on: "2026/10/04" }],
    ["大会成績が長すぎる", { tournament_result: "あ".repeat(31) }],
  ])("%s は 400", async (_label, overrides) => {
    const cookie = await setupOwner();
    const res = await app.request("/api/match-results", {
      method: "POST",
      headers: json(cookie),
      body: JSON.stringify({ ...validBody, ...overrides }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/match-results", () => {
  it("試合日の新しい順に並ぶ（登録順ではない）", async () => {
    const cookie = await setupOwner();
    await create(cookie, { played_on: "2026-09-01", opponent_name: "A" });
    await create(cookie, { played_on: "2026-10-04", opponent_name: "B" });
    await create(cookie, { played_on: "2026-08-15", opponent_name: "C" });

    const res = await app.request("/api/match-results");
    const body = (await res.json()) as { data: MatchResult[] };
    expect(body.data.map((r) => r.opponent_name)).toEqual(["B", "A", "C"]);
  });

  it("存在しないID・UUIDでないIDは 404", async () => {
    for (const id of [crypto.randomUUID(), "not-a-uuid"]) {
      const res = await app.request(`/api/match-results/${id}`);
      expect(res.status).toBe(404);
    }
  });
});

describe("PATCH /api/match-results/:id", () => {
  it("送った項目だけ変わり、大会成績は null で消せる", async () => {
    const cookie = await setupOwner();
    const created = await create(cookie);

    const res = await app.request(`/api/match-results/${created.id}`, {
      method: "PATCH",
      headers: json(cookie),
      body: JSON.stringify({ our_score: 3, tournament_result: null }),
    });
    expect(res.status).toBe(200);
    const updated = ((await res.json()) as { data: MatchResult }).data;
    expect(updated).toMatchObject({
      our_score: 3,
      tournament_result: null,
      opponent_name: validBody.opponent_name,
    });
  });

  it("何も送らないと 400、存在しないIDは 404", async () => {
    const cookie = await setupOwner();
    const created = await create(cookie);

    const empty = await app.request(`/api/match-results/${created.id}`, {
      method: "PATCH",
      headers: json(cookie),
      body: JSON.stringify({}),
    });
    expect(empty.status).toBe(400);

    const missing = await app.request(`/api/match-results/${crypto.randomUUID()}`, {
      method: "PATCH",
      headers: json(cookie),
      body: JSON.stringify({ our_score: 1 }),
    });
    expect(missing.status).toBe(404);
  });
});

describe("DELETE /api/match-results/:id", () => {
  it("削除すると詳細が 404 になる", async () => {
    const cookie = await setupOwner();
    const created = await create(cookie);

    const res = await app.request(`/api/match-results/${created.id}`, {
      method: "DELETE",
      headers: json(cookie),
    });
    expect(res.status).toBe(200);

    const detail = await app.request(`/api/match-results/${created.id}`);
    expect(detail.status).toBe(404);
  });
});
