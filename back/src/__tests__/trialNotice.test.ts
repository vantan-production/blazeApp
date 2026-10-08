// 体験申込者への連絡（/api/trial-notices）統合テスト
//
// 実送信は NODE_ENV=test でスキップされるため、mail.ts の送信口（mailTransport.send）を
// spyOn して「誰に・何通・どの形で」送ろうとしたかを検証する。
// 送信失敗は spy が Resend のエラーを返すことで再現する（テストではリトライ間隔を待たない）。

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { app } from "../app.js";
import { trialApplication, trialNotice, trialNoticeRecipient } from "../db/schema.js";
import { todayInJst } from "../trialNotice/jst.js";
import { type MailMessage, mailTransport } from "../utils/mail.js";
import { resetMonitoringSink, setMonitoringSink } from "../utils/monitoring.js";
import { cleanDb, testDb } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";

const D = "@trial-notice.test";
const ORIGIN = "http://localhost:3000";
const SUBJECT_PREFIX = "【西尾ブレイズ】";

let sendSpy: MockInstance<typeof mailTransport.send>;

beforeEach(async () => {
  await cleanDb();
  sendSpy = vi.spyOn(mailTransport, "send");
});

afterEach(() => {
  sendSpy.mockRestore();
  resetMonitoringSink();
});

/** 体験申込者への連絡メールとして送ろうとしたメール一覧（リトライ分も含む） */
const sentNoticeMails = (title: string): MailMessage[] =>
  sendSpy.mock.calls
    .map(([message]) => message)
    .filter((m) => m.subject === `${SUBJECT_PREFIX}${title}`);

/** 特定のアドレスへの送信だけ Resend がエラーを返す状況を再現する */
const failFor = (...addresses: string[]) =>
  sendSpy.mockImplementation(async (message) =>
    addresses.includes(String(message.to)) ? { error: { message: "rate limited" } } : { error: null },
  );

/** 体験申し込みを直接DBに用意する（日付を自由に決めるため API は通さない）。申込IDを返す */
async function seedApplication(
  email: string,
  trialDate: string,
  names: { name?: string; furigana?: string } = {},
): Promise<string> {
  const rows = await testDb
    .insert(trialApplication)
    .values({
      email,
      trial_date: trialDate,
      name: names.name ?? "山田太郎",
      furigana: names.furigana ?? "ヤマダタロウ",
      gender: "male",
      birth_date: "2014-04-01",
      school_name: "西尾市立西尾小学校",
      phone_number: "090-1234-5678",
      motivation: "instagram",
    })
    .returning({ id: trialApplication.id });
  const id = rows[0]?.id;
  if (!id) throw new Error("seed failed");
  return id;
}

async function postNotice(cookie: string, payload: Record<string, unknown>) {
  return app.request("/api/trial-notices", {
    method: "POST",
    headers: { Cookie: cookie, Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

const getJson = (path: string, cookie: string) => app.request(path, { headers: { Cookie: cookie } });

type Recipient = { application_id: string; name: string; email: string; trial_date: string };

type SendResponse = {
  success: boolean;
  message?: string;
  errors?: unknown;
  data: {
    notice: { id: string; title: string; recipient_count: number; admin_id: string } | null;
    sent: Recipient[];
    failed: Recipient[];
  };
};

const setupOwner = () => registerAndLogin("Owner", `owner${D}`);

const noticeCount = async () => (await testDb.select().from(trialNotice)).length;
const recipientRows = () => testDb.select().from(trialNoticeRecipient);

describe("権限", () => {
  it("未ログインは 401", async () => {
    expect((await app.request("/api/trial-notices")).status).toBe(401);
    expect((await app.request("/api/trial-notices/candidates")).status).toBe(401);
    expect(
      (await app.request("/api/trial-notices/00000000-0000-0000-0000-000000000000")).status,
    ).toBe(401);
    const res = await app.request("/api/trial-notices", {
      method: "POST",
      headers: { Origin: ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "t", body: "b", application_ids: [] }),
    });
    expect(res.status).toBe(401);
  });

  it("member は 403（送信も閲覧もできない）", async () => {
    await setupOwner();
    const member = await registerAndLogin("Member", `member${D}`);
    const id = await seedApplication("parent@example.com", "2099-01-15");

    expect((await getJson("/api/trial-notices", member)).status).toBe(403);
    expect((await getJson("/api/trial-notices/candidates", member)).status).toBe(403);
    expect((await getJson(`/api/trial-notices/${id}`, member)).status).toBe(403);
    const res = await postNotice(member, { title: "連絡", body: "本文", application_ids: [id] });
    expect(res.status).toBe(403);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("admin は送信できる", async () => {
    await setupOwner();
    const adminCookie = await registerAndLogin("Admin", `admin${D}`, undefined, "admin");
    const id = await seedApplication("parent@example.com", "2099-01-15");

    const res = await postNotice(adminCookie, {
      title: "admin送信",
      body: "本文",
      application_ids: [id],
    });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/trial-notices/candidates", () => {
  it("省略時は今日（JST）以降の申込者を、体験日→フリガナ順に全件返す", async () => {
    const cookie = await setupOwner();
    await seedApplication("past@example.com", "2000-01-01");
    const today = todayInJst();
    const todayId = await seedApplication("today@example.com", today, {
      name: "佐藤花子",
      furigana: "サトウハナコ",
    });
    const laterB = await seedApplication("b@example.com", "2099-12-31", {
      name: "山田次郎",
      furigana: "ヤマダジロウ",
    });
    const laterA = await seedApplication("a@example.com", "2099-12-31", {
      name: "伊藤一郎",
      furigana: "イトウイチロウ",
    });
    // 1ページの件数（10件）を超えても全件返す
    for (let i = 0; i < 11; i++) await seedApplication(`many${i}@example.com`, "2099-06-01");

    const res = await getJson("/api/trial-notices/candidates", cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        furigana: string;
        email: string;
        trial_date: string;
        created_at: string;
      }>;
      pagination?: unknown;
    };
    expect(body.success).toBe(true);
    expect(body.pagination).toBeUndefined();
    expect(body.data).toHaveLength(14);
    expect(body.data.map((a) => a.email)).not.toContain("past@example.com");
    expect(body.data[0]).toMatchObject({
      id: todayId,
      name: "佐藤花子",
      furigana: "サトウハナコ",
      email: "today@example.com",
      trial_date: today,
    });
    expect(body.data[0]?.created_at).toBeTruthy();
    expect(body.data.slice(-2).map((a) => a.id)).toEqual([laterA, laterB]);
    // 余計な申込項目（電話番号など）は返さない
    expect(Object.keys(body.data[0] ?? {}).sort()).toEqual(
      ["created_at", "email", "furigana", "id", "name", "trial_date"].sort(),
    );
  });

  it("trial_date を指定すると、その体験日の申込者だけ（過去日も指定できる）", async () => {
    const cookie = await setupOwner();
    await seedApplication("a@example.com", "2099-01-15");
    await seedApplication("b@example.com", "2099-01-16");
    await seedApplication("past@example.com", "2000-01-01");

    const dated = (await (
      await getJson("/api/trial-notices/candidates?trial_date=2099-01-16", cookie)
    ).json()) as { data: Array<{ email: string }> };
    expect(dated.data.map((a) => a.email)).toEqual(["b@example.com"]);

    const past = (await (
      await getJson("/api/trial-notices/candidates?trial_date=2000-01-01", cookie)
    ).json()) as { data: Array<{ email: string }> };
    expect(past.data.map((a) => a.email)).toEqual(["past@example.com"]);
  });

  it("日付の形式が不正なら 400", async () => {
    const cookie = await setupOwner();
    for (const q of ["abc", "2099/01/15", "2099-13-45"]) {
      const res = await getJson(`/api/trial-notices/candidates?trial_date=${q}`, cookie);
      expect(res.status).toBe(400);
    }
  });
});

describe("POST /api/trial-notices のバリデーション", () => {
  it("タイトル・本文・宛先の不備は 400 で、何も送らず保存もしない", async () => {
    const cookie = await setupOwner();
    const id = await seedApplication("a@example.com", "2099-01-15");

    const cases: Array<Record<string, unknown>> = [
      { title: "", body: "本文", application_ids: [id] },
      { title: "件名", application_ids: [id] },
      { title: "件名", body: "本文" },
      { title: "件名", body: "本文", application_ids: [] },
      { title: "件名", body: "本文", application_ids: ["not-a-uuid"] },
      { title: "件名", body: "本文", application_ids: [id, id] },
      {
        title: "件名",
        body: "本文",
        application_ids: Array.from({ length: 101 }, () => crypto.randomUUID()),
      },
    ];
    for (const payload of cases) {
      expect((await postNotice(cookie, payload)).status).toBe(400);
    }
    expect(sendSpy).not.toHaveBeenCalled();
    expect(await noticeCount()).toBe(0);
  });

  it("100件ちょうどは受け付ける（上限の境界）", async () => {
    const cookie = await setupOwner();
    const ids: string[] = [];
    for (let i = 0; i < 100; i++) ids.push(await seedApplication(`p${i}@example.com`, "2099-01-15"));

    const res = await postNotice(cookie, { title: "100件", body: "本文", application_ids: ids });
    expect(res.status).toBe(200);
    expect(sentNoticeMails("100件")).toHaveLength(100);
  });

  it("存在しない申込IDが含まれていれば 400 で、誰にも送らない", async () => {
    const cookie = await setupOwner();
    const id = await seedApplication("a@example.com", "2099-01-15");

    const res = await postNotice(cookie, {
      title: "不明ID",
      body: "本文",
      application_ids: [id, crypto.randomUUID()],
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { success: boolean; errors: string };
    expect(body).toEqual({ success: false, errors: "選択した申込者が見つかりません。" });
    expect(sendSpy).not.toHaveBeenCalled();
    expect(await noticeCount()).toBe(0);
  });
});

describe("POST /api/trial-notices の送信", () => {
  it("選んだ申込者にだけ1人1通ずつ送り、他の申込者のアドレスを含めない", async () => {
    const cookie = await setupOwner();
    const emails = ["a@example.com", "b@example.com", "c@example.com"];
    const ids: string[] = [];
    for (const email of emails) ids.push(await seedApplication(email, "2099-01-15"));
    await seedApplication("not-selected@example.com", "2099-01-15");

    const res = await postNotice(cookie, { title: "個別送信", body: "本文です", application_ids: ids });
    expect(res.status).toBe(200);
    const body = (await res.json()) as SendResponse;
    expect(body.success).toBe(true);
    expect(body.message).toBe("3件送信しました。");
    expect(body.data.failed).toEqual([]);
    expect(body.data.sent.map((r) => r.application_id).sort()).toEqual([...ids].sort());
    expect(body.data.sent[0]).toEqual({
      application_id: expect.any(String),
      name: "山田太郎",
      email: expect.stringMatching(/@example\.com$/),
      trial_date: "2099-01-15",
    });
    expect(body.data.notice).toMatchObject({ title: "個別送信", recipient_count: 3 });
    expect(Object.keys(body.data.notice ?? {}).sort()).toEqual(
      ["admin_id", "body", "created_at", "id", "recipient_count", "title", "updated_at"].sort(),
    );

    const mails = sentNoticeMails("個別送信");
    expect(mails).toHaveLength(3);
    for (const mail of mails) {
      // 1通の宛先は必ず文字列1件。配列や bcc に複数を載せない
      expect(typeof mail.to).toBe("string");
      expect(mail.bcc).toBeUndefined();
      const others = [...emails, "not-selected@example.com"].filter((e) => e !== mail.to);
      for (const other of others) expect(JSON.stringify(mail)).not.toContain(other);
    }
    expect(mails.map((m) => m.to).sort()).toEqual(emails);

    const rows = await recipientRows();
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.notice_id === body.data.notice?.id)).toBe(true);
  });

  it("同じアドレス（大文字小文字・前後の空白違いを含む）の申込は1通にまとめ、全員を送信済みにする", async () => {
    const cookie = await setupOwner();
    const a = await seedApplication("sibling@example.com", "2099-01-15", { name: "兄" });
    const b = await seedApplication(" Sibling@Example.com ", "2099-02-01", { name: "弟" });
    const c = await seedApplication("other@example.com", "2099-01-15");

    const res = await postNotice(cookie, { title: "重複", body: "本文", application_ids: [a, b, c] });
    expect(res.status).toBe(200);
    const body = (await res.json()) as SendResponse;
    expect(body.message).toBe("2件送信しました。");
    expect(body.data.notice?.recipient_count).toBe(2);
    expect(body.data.sent.map((r) => r.application_id).sort()).toEqual([a, b, c].sort());

    const mails = sentNoticeMails("重複");
    expect(mails).toHaveLength(2);
    expect(mails.map((m) => m.to).sort()).toEqual(["other@example.com", "sibling@example.com"]);

    // 履歴には申込ごとに残す（兄弟それぞれの名前・体験日が分かるように）
    const rows = await recipientRows();
    expect(rows.map((r) => r.name).sort()).toEqual(["兄", "山田太郎", "弟"].sort());
  });

  it("1回目に失敗しても自動でやり直し、2回目で届けば送信済みとして記録する", async () => {
    const cookie = await setupOwner();
    const id = await seedApplication("retry@example.com", "2099-01-15");
    sendSpy.mockResolvedValueOnce({ error: { message: "rate limited" } });

    const res = await postNotice(cookie, { title: "再試行", body: "本文", application_ids: [id] });
    expect(res.status).toBe(200);
    const body = (await res.json()) as SendResponse;
    expect(body.message).toBe("1件送信しました。");
    expect(body.data.sent.map((r) => r.application_id)).toEqual([id]);
    expect(body.data.failed).toEqual([]);
    expect(sentNoticeMails("再試行")).toHaveLength(2);

    const rows = await recipientRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ trial_application_id: id, email: "retry@example.com" });
  });

  it("送信口が例外を投げた場合もやり直す", async () => {
    const cookie = await setupOwner();
    const id = await seedApplication("throw@example.com", "2099-01-15");
    sendSpy.mockRejectedValueOnce(new Error("ECONNRESET"));

    const res = await postNotice(cookie, { title: "例外", body: "本文", application_ids: [id] });
    expect(res.status).toBe(200);
    expect(sentNoticeMails("例外")).toHaveLength(2);
  });

  it("一部が3回とも失敗したら、成功分だけ保存し、失敗した申込を failed で返す", async () => {
    const cookie = await setupOwner();
    const ok1 = await seedApplication("a@example.com", "2099-01-15");
    const bad = await seedApplication("bad@example.com", "2099-01-15", { name: "失敗太郎" });
    const ok2 = await seedApplication("c@example.com", "2099-01-16");
    failFor("bad@example.com");
    const logs: string[] = [];
    setMonitoringSink((line) => logs.push(line));

    const res = await postNotice(cookie, {
      title: "一部失敗",
      body: "本文",
      application_ids: [ok1, bad, ok2],
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as SendResponse;
    expect(body.success).toBe(true);
    expect(body.message).toBe("3件中1件の送信に失敗しました。失敗した方に再送してください。");
    expect(body.data.failed).toEqual([
      { application_id: bad, name: "失敗太郎", email: "bad@example.com", trial_date: "2099-01-15" },
    ]);
    expect(body.data.sent.map((r) => r.application_id).sort()).toEqual([ok1, ok2].sort());
    expect(body.data.notice?.recipient_count).toBe(2);

    // 失敗した宛先には3回まで試す
    const toBad = sentNoticeMails("一部失敗").filter((m) => m.to === "bad@example.com");
    expect(toBad).toHaveLength(3);

    const rows = await recipientRows();
    expect(rows.map((r) => r.email).sort()).toEqual(["a@example.com", "c@example.com"]);

    // 最終的な失敗は既存の監視ログ（APP_ERROR）に1件残し、宛先アドレスは載せない
    const errors = logs.map((l) => JSON.parse(l)).filter((l) => l.scope === "trialNotice.send");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ type: "APP_ERROR", application_ids: [bad], attempts: 3 });
    expect(logs.join("\n")).not.toContain("@example.com");
  });

  it("失敗した申込を選び直して再送すると、新しい履歴として保存される", async () => {
    const cookie = await setupOwner();
    const ok = await seedApplication("a@example.com", "2099-01-15");
    const bad = await seedApplication("bad@example.com", "2099-01-15");
    failFor("bad@example.com");

    const first = (await (
      await postNotice(cookie, { title: "再送", body: "本文", application_ids: [ok, bad] })
    ).json()) as SendResponse;
    const retryIds = first.data.failed.map((r) => r.application_id);
    expect(retryIds).toEqual([bad]);

    sendSpy.mockImplementation(async () => ({ error: null }));
    const second = await postNotice(cookie, { title: "再送", body: "本文", application_ids: retryIds });
    expect(second.status).toBe(200);
    expect(await noticeCount()).toBe(2);
    expect((await recipientRows()).map((r) => r.email).sort()).toEqual([
      "a@example.com",
      "bad@example.com",
    ]);
  });

  it("全員に届かなければ 502 を返し、履歴を何も保存しない", async () => {
    const cookie = await setupOwner();
    const a = await seedApplication("a@example.com", "2099-01-15");
    const b = await seedApplication("b@example.com", "2099-01-15");
    failFor("a@example.com", "b@example.com");

    const res = await postNotice(cookie, { title: "全滅", body: "本文", application_ids: [a, b] });
    expect(res.status).toBe(502);
    const body = (await res.json()) as SendResponse;
    expect(body.success).toBe(false);
    expect(body.errors).toBe("送信に失敗しました。時間をおいて再送してください。");
    expect(body.data.notice).toBeNull();
    expect(body.data.sent).toEqual([]);
    expect(body.data.failed.map((r) => r.application_id).sort()).toEqual([a, b].sort());
    expect(sentNoticeMails("全滅")).toHaveLength(6);

    expect(await noticeCount()).toBe(0);
    expect(await recipientRows()).toHaveLength(0);
  });
});

describe("GET /api/trial-notices（送信履歴）", () => {
  it("新しい順に、送信者名付きで返す", async () => {
    const cookie = await setupOwner();
    const id = await seedApplication("a@example.com", "2099-01-15");

    await postNotice(cookie, { title: "1通目", body: "本文", application_ids: [id] });
    await postNotice(cookie, { title: "2通目", body: "本文", application_ids: [id] });

    const res = await getJson("/api/trial-notices", cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ title: string; admin_name: string; recipient_count: number }>;
      pagination: { total: number; page: number };
    };
    expect(body.pagination).toMatchObject({ total: 2, page: 1 });
    expect(body.data.map((n) => n.title)).toEqual(["2通目", "1通目"]);
    expect(body.data[0]).toMatchObject({ admin_name: "Owner", recipient_count: 1 });
    expect(body.data[0]).not.toHaveProperty("recipients");
  });
});

describe("GET /api/trial-notices/:id（送信履歴の詳細）", () => {
  it("連絡の内容と、送信できた宛先（送信時点の写し）を返す", async () => {
    const cookie = await setupOwner();
    const a = await seedApplication("a@example.com", "2099-01-15", { name: "佐藤花子" });
    const bad = await seedApplication("bad@example.com", "2099-01-15");
    failFor("bad@example.com");

    const sent = (await (
      await postNotice(cookie, { title: "詳細", body: "本文です", application_ids: [a, bad] })
    ).json()) as SendResponse;
    const noticeId = sent.data.notice?.id;

    // 送信後に申込が削除されても、履歴の宛先は残る
    await testDb.delete(trialApplication).where(eq(trialApplication.id, a));

    const res = await getJson(`/api/trial-notices/${noticeId}`, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        id: string;
        title: string;
        body: string;
        admin_name: string;
        recipient_count: number;
        recipients: Array<Omit<Recipient, "application_id"> & {
          application_id: string | null;
          sent_at: string;
        }>;
      };
    };
    expect(body.data).toMatchObject({
      id: noticeId,
      title: "詳細",
      body: "本文です",
      admin_name: "Owner",
      recipient_count: 1,
    });
    expect(body.data.recipients).toHaveLength(1);
    expect(body.data.recipients[0]).toMatchObject({
      application_id: null,
      name: "佐藤花子",
      email: "a@example.com",
      trial_date: "2099-01-15",
    });
    expect(Number.isNaN(Date.parse(body.data.recipients[0]?.sent_at ?? ""))).toBe(false);
  });

  it("存在しないIDや uuid 形式でないIDは 404", async () => {
    const cookie = await setupOwner();
    for (const id of [crypto.randomUUID(), "not-a-uuid", "123"]) {
      const res = await getJson(`/api/trial-notices/${id}`, cookie);
      expect(res.status).toBe(404);
      const body = (await res.json()) as { success: boolean };
      expect(body.success).toBe(false);
    }
  });
});

describe("todayInJst", () => {
  it("UTC では前日でも、日本時間の日付を返す", () => {
    // 2026-09-23T15:30Z = 日本時間 2026-09-24 00:30
    expect(todayInJst(new Date("2026-09-23T15:30:00Z"))).toBe("2026-09-24");
    expect(todayInJst(new Date("2026-09-23T14:59:59Z"))).toBe("2026-09-23");
  });
});
