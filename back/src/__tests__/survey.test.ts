// アンケート／出欠確認（Phase 2）統合テスト

import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { cleanDb } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";

const D = "@survey.test";

beforeEach(async () => {
  await cleanDb();
});

const setupOwner = () => registerAndLogin("Owner", `owner${D}`);
const setupMember = () => registerAndLogin("Member", `member${D}`);

const json = (cookie: string) => ({
  "Content-Type": "application/json",
  Cookie: cookie,
});

/** 出欠確認を作成して { id, options } を返す */
async function createAttendanceSurvey(
  cookie: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await app.request("/api/surveys", {
    method: "POST",
    headers: json(cookie),
    body: JSON.stringify({
      title: "10/12 練習試合の出欠",
      body: "集合は8時です",
      options: [{ label: "出席" }, { label: "欠席" }, { label: "未定" }],
      ...overrides,
    }),
  });
  if (res.status !== 200) {
    throw new Error(`createSurvey failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { data: { id: string } };

  const detail = await app.request(`/api/surveys/${body.data.id}`, {
    headers: { Cookie: cookie },
  });
  const detailBody = (await detail.json()) as {
    data: { options: Array<{ id: string; label: string }> };
  };

  return { id: body.data.id, options: detailBody.data.options };
}

// --- 作成 ---

describe("POST /api/surveys", () => {
  it("admin 以上は作成できる", async () => {
    const cookie = await setupOwner();
    const survey = await createAttendanceSurvey(cookie);
    expect(survey.options.map((o) => o.label)).toEqual(["出席", "欠席", "未定"]);
  });

  it("member は 403", async () => {
    await setupOwner();
    const memberCookie = await setupMember();
    const res = await app.request("/api/surveys", {
      method: "POST",
      headers: json(memberCookie),
      body: JSON.stringify({
        title: "勝手なアンケート",
        options: [{ label: "はい" }, { label: "いいえ" }],
      }),
    });
    expect(res.status).toBe(403);
  });

  it("選択肢が1つだと 400", async () => {
    const cookie = await setupOwner();
    const res = await app.request("/api/surveys", {
      method: "POST",
      headers: json(cookie),
      body: JSON.stringify({ title: "選択肢不足", options: [{ label: "はい" }] }),
    });
    expect(res.status).toBe(400);
  });

  it("未ログインは 401", async () => {
    const res = await app.request("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "x",
        options: [{ label: "a" }, { label: "b" }],
      }),
    });
    expect(res.status).toBe(401);
  });
});

// --- 回答 ---

describe("POST /api/surveys/:id/responses", () => {
  it("member は回答できる", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie);
    const memberCookie = await setupMember();

    const res = await app.request(`/api/surveys/${survey.id}/responses`, {
      method: "POST",
      headers: json(memberCookie),
      body: JSON.stringify({
        option_ids: [survey.options[0]?.id],
        comment: "少し遅れます",
      }),
    });
    expect(res.status).toBe(200);

    const detail = await app.request(`/api/surveys/${survey.id}`, {
      headers: { Cookie: memberCookie },
    });
    const body = (await detail.json()) as {
      data: { my_response: { option_ids: string[]; comment: string } };
    };
    expect(body.data.my_response.option_ids).toEqual([survey.options[0]?.id]);
    expect(body.data.my_response.comment).toBe("少し遅れます");
  });

  it("回答し直すと上書きされる", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie);
    const memberCookie = await setupMember();

    for (const index of [0, 1]) {
      const res = await app.request(`/api/surveys/${survey.id}/responses`, {
        method: "POST",
        headers: json(memberCookie),
        body: JSON.stringify({ option_ids: [survey.options[index]?.id] }),
      });
      expect(res.status).toBe(200);
    }

    const detail = await app.request(`/api/surveys/${survey.id}`, {
      headers: { Cookie: memberCookie },
    });
    const body = (await detail.json()) as {
      data: { my_response: { option_ids: string[] } };
    };
    expect(body.data.my_response.option_ids).toEqual([survey.options[1]?.id]);
  });

  it("単一選択に2つ送ると 400", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie);
    const memberCookie = await setupMember();

    const res = await app.request(`/api/surveys/${survey.id}/responses`, {
      method: "POST",
      headers: json(memberCookie),
      body: JSON.stringify({
        option_ids: [survey.options[0]?.id, survey.options[1]?.id],
      }),
    });
    expect(res.status).toBe(400);
  });

  it("複数選択を許可すれば2つ送れる", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie, {
      allow_multiple: true,
    });
    const memberCookie = await setupMember();

    const res = await app.request(`/api/surveys/${survey.id}/responses`, {
      method: "POST",
      headers: json(memberCookie),
      body: JSON.stringify({
        option_ids: [survey.options[0]?.id, survey.options[1]?.id],
      }),
    });
    expect(res.status).toBe(200);
  });

  it("締切を過ぎていると 400", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie, {
      closes_at: new Date(Date.now() - 60 * 1000).toISOString(),
    });
    const memberCookie = await setupMember();

    const res = await app.request(`/api/surveys/${survey.id}/responses`, {
      method: "POST",
      headers: json(memberCookie),
      body: JSON.stringify({ option_ids: [survey.options[0]?.id] }),
    });
    expect(res.status).toBe(400);
  });

  it("他のアンケートの選択肢は受け付けない", async () => {
    const ownerCookie = await setupOwner();
    const first = await createAttendanceSurvey(ownerCookie);
    const second = await createAttendanceSurvey(ownerCookie);
    const memberCookie = await setupMember();

    const res = await app.request(`/api/surveys/${first.id}/responses`, {
      method: "POST",
      headers: json(memberCookie),
      body: JSON.stringify({ option_ids: [second.options[0]?.id] }),
    });
    expect(res.status).toBe(400);
  });

  it("未ログインは 401", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie);

    const res = await app.request(`/api/surveys/${survey.id}/responses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option_ids: [survey.options[0]?.id] }),
    });
    expect(res.status).toBe(401);
  });
});

// --- 一覧・詳細 ---

describe("GET /api/surveys", () => {
  it("回答状況と締切状態が付く", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie);
    const memberCookie = await setupMember();

    const before = await app.request("/api/surveys", {
      headers: { Cookie: memberCookie },
    });
    const beforeBody = (await before.json()) as {
      data: Array<{ has_responded: boolean; is_closed: boolean }>;
    };
    expect(beforeBody.data[0]?.has_responded).toBe(false);
    expect(beforeBody.data[0]?.is_closed).toBe(false);

    await app.request(`/api/surveys/${survey.id}/responses`, {
      method: "POST",
      headers: json(memberCookie),
      body: JSON.stringify({ option_ids: [survey.options[0]?.id] }),
    });

    const after = await app.request("/api/surveys", {
      headers: { Cookie: memberCookie },
    });
    const afterBody = (await after.json()) as {
      data: Array<{ has_responded: boolean }>;
    };
    expect(afterBody.data[0]?.has_responded).toBe(true);
  });

  it("未ログインは 401", async () => {
    expect((await app.request("/api/surveys")).status).toBe(401);
  });

  it("詳細には他人の回答が含まれない", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie);
    const memberCookie = await setupMember();

    await app.request(`/api/surveys/${survey.id}/responses`, {
      method: "POST",
      headers: json(memberCookie),
      body: JSON.stringify({ option_ids: [survey.options[0]?.id] }),
    });

    const detail = await app.request(`/api/surveys/${survey.id}`, {
      headers: { Cookie: ownerCookie },
    });
    const body = (await detail.json()) as {
      data: { my_response: { option_ids: string[] } };
    };
    expect(body.data.my_response.option_ids).toEqual([]);
  });
});

// --- 集計・未回答者 ---

describe("集計と未回答者", () => {
  it("集計は票数と投票者を返す", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie);
    const memberCookie = await setupMember();

    await app.request(`/api/surveys/${survey.id}/responses`, {
      method: "POST",
      headers: json(memberCookie),
      body: JSON.stringify({
        option_ids: [survey.options[0]?.id],
        comment: "よろしくお願いします",
      }),
    });

    const res = await app.request(`/api/surveys/${survey.id}/results`, {
      headers: { Cookie: ownerCookie },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: {
        respondent_count: number;
        options: Array<{ label: string; count: number; voters: Array<{ email: string }> }>;
        comments: Array<{ comment: string }>;
      };
    };
    expect(body.data.respondent_count).toBe(1);
    expect(body.data.options[0]?.count).toBe(1);
    expect(body.data.options[0]?.voters[0]?.email).toBe(`member${D}`);
    expect(body.data.options[1]?.count).toBe(0);
    expect(body.data.comments[0]?.comment).toBe("よろしくお願いします");
  });

  it("複数選択でも実人数で数える", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie, { allow_multiple: true });
    const memberCookie = await setupMember();

    await app.request(`/api/surveys/${survey.id}/responses`, {
      method: "POST",
      headers: json(memberCookie),
      body: JSON.stringify({
        option_ids: [survey.options[0]?.id, survey.options[1]?.id],
      }),
    });

    const res = await app.request(`/api/surveys/${survey.id}/results`, {
      headers: { Cookie: ownerCookie },
    });
    const body = (await res.json()) as { data: { respondent_count: number } };
    expect(body.data.respondent_count).toBe(1);
  });

  it("未回答者一覧に未回答のユーザーだけが並ぶ", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie);
    const memberCookie = await setupMember();

    const before = await app.request(`/api/surveys/${survey.id}/pending`, {
      headers: { Cookie: ownerCookie },
    });
    const beforeBody = (await before.json()) as {
      data: { total: number; pending_count: number };
    };
    expect(beforeBody.data.total).toBe(2);
    expect(beforeBody.data.pending_count).toBe(2);

    await app.request(`/api/surveys/${survey.id}/responses`, {
      method: "POST",
      headers: json(memberCookie),
      body: JSON.stringify({ option_ids: [survey.options[0]?.id] }),
    });

    const after = await app.request(`/api/surveys/${survey.id}/pending`, {
      headers: { Cookie: ownerCookie },
    });
    const afterBody = (await after.json()) as {
      data: { pending_count: number; responded_count: number; pending: Array<{ email: string }> };
    };
    expect(afterBody.data.responded_count).toBe(1);
    expect(afterBody.data.pending_count).toBe(1);
    expect(afterBody.data.pending[0]?.email).toBe(`owner${D}`);
  });

  it("集計・未回答者は member から見えない", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie);
    const memberCookie = await setupMember();

    for (const path of ["results", "pending"]) {
      const res = await app.request(`/api/surveys/${survey.id}/${path}`, {
        headers: { Cookie: memberCookie },
      });
      expect(res.status).toBe(403);
    }
  });
});

// --- 更新・削除 ---

describe("更新と削除", () => {
  it("タイトルだけ更新できる", async () => {
    const cookie = await setupOwner();
    const survey = await createAttendanceSurvey(cookie);

    const res = await app.request(`/api/surveys/${survey.id}`, {
      method: "PATCH",
      headers: json(cookie),
      body: JSON.stringify({ title: "10/13 に変更" }),
    });
    expect(res.status).toBe(200);

    const detail = await app.request(`/api/surveys/${survey.id}`, {
      headers: { Cookie: cookie },
    });
    const body = (await detail.json()) as { data: { title: string; options: unknown[] } };
    expect(body.data.title).toBe("10/13 に変更");
    expect(body.data.options).toHaveLength(3);
  });

  it("選択肢を入れ替えると既存の回答は消える", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie);
    const memberCookie = await setupMember();

    await app.request(`/api/surveys/${survey.id}/responses`, {
      method: "POST",
      headers: json(memberCookie),
      body: JSON.stringify({ option_ids: [survey.options[0]?.id] }),
    });

    await app.request(`/api/surveys/${survey.id}`, {
      method: "PATCH",
      headers: json(ownerCookie),
      body: JSON.stringify({ options: [{ label: "参加" }, { label: "不参加" }] }),
    });

    const res = await app.request(`/api/surveys/${survey.id}/results`, {
      headers: { Cookie: ownerCookie },
    });
    const body = (await res.json()) as { data: { respondent_count: number } };
    expect(body.data.respondent_count).toBe(0);
  });

  it("削除できる", async () => {
    const cookie = await setupOwner();
    const survey = await createAttendanceSurvey(cookie);

    const res = await app.request(`/api/surveys/${survey.id}`, {
      method: "DELETE",
      headers: json(cookie),
    });
    expect(res.status).toBe(200);

    const detail = await app.request(`/api/surveys/${survey.id}`, {
      headers: { Cookie: cookie },
    });
    expect(detail.status).toBe(404);
  });

  it("member は更新・削除できない", async () => {
    const ownerCookie = await setupOwner();
    const survey = await createAttendanceSurvey(ownerCookie);
    const memberCookie = await setupMember();

    const patchRes = await app.request(`/api/surveys/${survey.id}`, {
      method: "PATCH",
      headers: json(memberCookie),
      body: JSON.stringify({ title: "書き換え" }),
    });
    expect(patchRes.status).toBe(403);

    const deleteRes = await app.request(`/api/surveys/${survey.id}`, {
      method: "DELETE",
      headers: json(memberCookie),
    });
    expect(deleteRes.status).toBe(403);
  });
});
