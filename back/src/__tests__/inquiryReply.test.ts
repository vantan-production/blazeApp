// 問い合わせへの返信メール（POST /api/inquiry/:id/reply と再送）統合テスト
//
// 実送信は NODE_ENV=test でスキップされるため、mail.ts の送信口（mailTransport.send）を
// spyOn して「誰に・何を」送ろうとしたかを検証する。
// 送信失敗は spy が Resend のエラーを返すことで、応答なしは解決しない Promise で再現する。

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { app } from "../app.js";
import { inquiry, reply } from "../db/schema.js";
import { type MailMessage, mailTransport } from "../utils/mail.js";
import { resetMonitoringSink, setMonitoringSink } from "../utils/monitoring.js";
import { cleanDb, testDb } from "./setup.js";
import { registerAndLogin } from "./testHelpers.js";

const D = "@inquiry-reply.test";
const ORIGIN = "http://localhost:3000";
const REPLY_SUBJECT = "【西尾ブレイズ】Re: 入団について";

// 1x1 透明PNG（実データなのでsharpでの圧縮処理を通せる）
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

let sendSpy: MockInstance<typeof mailTransport.send>;

beforeEach(async () => {
  await cleanDb();
  sendSpy = vi.spyOn(mailTransport, "send");
});

afterEach(() => {
  sendSpy.mockRestore();
  resetMonitoringSink();
});

/** 返信メールとして送ろうとしたメール一覧（問い合わせ時の自動返信は除く） */
const sentReplyMails = (): Array<{ message: MailMessage; idempotencyKey?: string | undefined }> =>
  sendSpy.mock.calls
    .filter(([message]) => message.subject === REPLY_SUBJECT)
    .map(([message, options]) => ({ message, idempotencyKey: options?.idempotencyKey }));

/** 返信メールの送信だけ Resend がエラーを返す状況を再現する */
const failReplyMail = () =>
  sendSpy.mockImplementation(async (message) =>
    message.subject === REPLY_SUBJECT ? { error: { message: "rate limited" } } : { error: null },
  );

const setupOwner = () => registerAndLogin("Owner", `owner${D}`);

/** 問い合わせを1件 API 経由で作ってIDを返す */
async function createInquiry(email = "guest@example.com"): Promise<string> {
  const fd = new FormData();
  fd.append("name", "佐藤 次郎");
  fd.append("email", email);
  fd.append("title", "入団について");
  fd.append("body", "練習日を教えてください。");
  const res = await app.request("/api/inquiry", { method: "POST", headers: { Origin: ORIGIN }, body: fd });
  const json = (await res.json()) as { data: { id: string } };
  return json.data.id;
}

/** email 欄を追加する前の問い合わせ（メールアドレスなし）を直接DBに用意する */
async function seedInquiryWithoutEmail(): Promise<string> {
  const rows = await testDb
    .insert(inquiry)
    .values({ name: "佐藤 次郎", title: "入団について", body: "練習日を教えてください。" })
    .returning({ id: inquiry.id });
  const id = rows[0]?.id;
  if (!id) throw new Error("seed failed");
  return id;
}

async function postReply(
  cookie: string,
  inquiryId: string,
  options: { body?: string; image?: File; file?: File } = {},
) {
  const fd = new FormData();
  fd.append("title", "Re: 入団について");
  fd.append("body", options.body ?? "毎週土曜日です。");
  if (options.image) fd.append("image", options.image);
  if (options.file) fd.append("file", options.file);
  return app.request(`/api/inquiry/${inquiryId}/reply`, {
    method: "POST",
    headers: { Cookie: cookie, Origin: ORIGIN },
    body: fd,
  });
}

async function resend(cookie: string, inquiryId: string, replyId: string) {
  return app.request(`/api/inquiry/${inquiryId}/reply/${replyId}/mail`, {
    method: "POST",
    headers: { Cookie: cookie, Origin: ORIGIN },
  });
}

type ReplyResponse = {
  success: boolean;
  message: string;
  mail_status: "sent" | "failed" | "no_address";
  data: { id: string; mail_sent_at: string | null };
};

const replyRow = async (id: string) =>
  (await testDb.select().from(reply).where(eq(reply.id, id)))[0];

describe("POST /api/inquiry/:id/reply — 返信メール", () => {
  it("返信を保存し、問い合わせ元1人に返信メールを送って mail_sent_at を記録する", async () => {
    const cookie = await setupOwner();
    const id = await createInquiry();

    const res = await postReply(cookie, id);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ReplyResponse;
    expect(body.mail_status).toBe("sent");
    expect(body.message).toBe("返信を投稿し、問い合わせ元にメールを送信しました。");
    expect(body.data.mail_sent_at).not.toBeNull();

    const mails = sentReplyMails();
    expect(mails).toHaveLength(1);
    const mail = mails[0];
    if (!mail) throw new Error("返信メールが送られていません");
    expect(mail.message.to).toBe("guest@example.com");
    expect(mail.message.bcc).toBeUndefined();
    expect(mail.message.html).toContain("佐藤 次郎 様");
    expect(mail.message.html).toContain("毎週土曜日です。");
    expect(mail.message.html).toContain("練習日を教えてください。");
    expect(mail.message.attachments).toBeUndefined();
    // 打ち切った送信を再送しても二重に届かないよう、返信IDから作った冪等キーを付ける
    expect(mail.idempotencyKey).toBe(`inquiry-reply/${body.data.id}`);

    expect((await replyRow(body.data.id))?.mail_sent_at).not.toBeNull();
  });

  it("返信に添付した画像・ファイルをメールにも添付する", async () => {
    const cookie = await setupOwner();
    const id = await createInquiry();

    const res = await postReply(cookie, id, {
      image: new File([PNG_1X1], "photo.png", { type: "image/png" }),
      file: new File(["練習日程"], "schedule.pdf", { type: "application/pdf" }),
    });
    expect(res.status).toBe(200);

    const attachments = sentReplyMails()[0]?.message.attachments ?? [];
    expect(attachments.map((a) => a.filename)).toEqual(["image.webp", "schedule.pdf"]);
    for (const a of attachments) expect(a.content.length).toBeGreaterThan(0);
  });

  it("送信に失敗しても返信は保存し、mail_status: failed で知らせる（mail_sent_at は null）", async () => {
    const cookie = await setupOwner();
    const id = await createInquiry();
    failReplyMail();
    const logs: string[] = [];
    setMonitoringSink((line) => logs.push(line));

    const res = await postReply(cookie, id);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ReplyResponse;
    expect(body.success).toBe(true);
    expect(body.mail_status).toBe("failed");
    expect(body.message).toBe(
      "返信を投稿しましたが、メールの送信に失敗しました。時間をおいて再送してください。",
    );
    expect(body.data.mail_sent_at).toBeNull();

    const saved = await replyRow(body.data.id);
    expect(saved?.body).toBe("毎週土曜日です。");
    expect(saved?.mail_sent_at).toBeNull();

    // 失敗は監視ログ（APP_ERROR）に残し、宛先アドレスは載せない
    const errors = logs.map((l) => JSON.parse(l)).filter((l) => l.scope === "inquiry.replyMail");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ type: "APP_ERROR", inquiry_id: id, reply_id: body.data.id });
    expect(logs.join("\n")).not.toContain("@example.com");
  });

  it("送信の応答が返ってこなければ打ち切って failed にする", async () => {
    const cookie = await setupOwner();
    const id = await createInquiry();
    sendSpy.mockImplementation((message) =>
      message.subject === REPLY_SUBJECT
        ? new Promise(() => {})
        : Promise.resolve({ error: null }),
    );

    const res = await postReply(cookie, id);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ReplyResponse;
    expect(body.mail_status).toBe("failed");
    expect((await replyRow(body.data.id))?.mail_sent_at).toBeNull();
  });

  it("メールアドレスの無い問い合わせには送らず、mail_status: no_address を返す", async () => {
    const cookie = await setupOwner();
    const id = await seedInquiryWithoutEmail();

    const res = await postReply(cookie, id);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ReplyResponse;
    expect(body.mail_status).toBe("no_address");
    expect(body.data.mail_sent_at).toBeNull();
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("詳細の replies に mail_sent_at が含まれる", async () => {
    const cookie = await setupOwner();
    const id = await createInquiry();
    await postReply(cookie, id);

    const res = await app.request(`/api/inquiry/${id}`, { headers: { Cookie: cookie } });
    const body = (await res.json()) as { data: { replies: Array<{ mail_sent_at: string | null }> } };
    expect(body.data.replies[0]?.mail_sent_at).not.toBeNull();
  });
});

describe("POST /api/inquiry/:id/reply — 対応ステータスの自動更新", () => {
  async function patchStatus(cookie: string, id: string, status: string) {
    return app.request(`/api/inquiry/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: ORIGIN },
      body: JSON.stringify({ status }),
    });
  }

  const statusOf = async (id: string) =>
    (await testDb.select().from(inquiry).where(eq(inquiry.id, id)))[0]?.status;

  it("未対応の問い合わせに返信すると対応中になり、inquiry_status で返す", async () => {
    const cookie = await setupOwner();
    const id = await createInquiry();

    const res = await postReply(cookie, id);
    const body = (await res.json()) as ReplyResponse & { inquiry_status: string };
    expect(body.inquiry_status).toBe("in_progress");
    expect(await statusOf(id)).toBe("in_progress");
  });

  it("対応済みの問い合わせに返信しても対応済みのまま", async () => {
    const cookie = await setupOwner();
    const id = await createInquiry();
    await patchStatus(cookie, id, "resolved");

    const res = await postReply(cookie, id);
    const body = (await res.json()) as ReplyResponse & { inquiry_status: string };
    expect(body.inquiry_status).toBe("resolved");
    expect(await statusOf(id)).toBe("resolved");
  });

  it("対応中の問い合わせに返信しても対応中のまま", async () => {
    const cookie = await setupOwner();
    const id = await createInquiry();
    await patchStatus(cookie, id, "in_progress");

    await postReply(cookie, id);
    expect(await statusOf(id)).toBe("in_progress");
  });

  it("メールの送信に失敗しても、返信を保存したので対応中になる", async () => {
    const cookie = await setupOwner();
    const id = await createInquiry();
    failReplyMail();

    const body = (await (await postReply(cookie, id)).json()) as ReplyResponse;
    expect(body.mail_status).toBe("failed");
    expect(await statusOf(id)).toBe("in_progress");
  });

  it("入力エラーで返信を保存しなかったときは未対応のまま", async () => {
    const cookie = await setupOwner();
    const id = await createInquiry();

    const res = await postReply(cookie, id, { body: "" });
    expect(res.status).toBe(400);
    expect(await statusOf(id)).toBe("pending");
  });
});

describe("POST /api/inquiry/:id/reply/:reply_id/mail — 返信メールの再送", () => {
  /** 送信に失敗した返信を1件用意し、問い合わせIDと返信IDを返す */
  async function seedFailedReply(cookie: string) {
    const id = await createInquiry();
    failReplyMail();
    const res = await postReply(cookie, id);
    const body = (await res.json()) as ReplyResponse;
    sendSpy.mockReset();
    return { inquiryId: id, replyId: body.data.id };
  }

  it("失敗した返信を再送でき、mail_sent_at を記録する（冪等キーは初回と同じ）", async () => {
    const cookie = await setupOwner();
    const { inquiryId, replyId } = await seedFailedReply(cookie);

    const res = await resend(cookie, inquiryId, replyId);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { message: string; data: { mail_sent_at: string | null } };
    expect(body.message).toBe("返信メールを送信しました。");
    expect(body.data.mail_sent_at).not.toBeNull();

    const mails = sentReplyMails();
    expect(mails).toHaveLength(1);
    expect(mails[0]?.message.to).toBe("guest@example.com");
    expect(mails[0]?.idempotencyKey).toBe(`inquiry-reply/${replyId}`);
    expect((await replyRow(replyId))?.mail_sent_at).not.toBeNull();
  });

  it("再送も失敗したら 502（mail_sent_at は null のまま）", async () => {
    const cookie = await setupOwner();
    const { inquiryId, replyId } = await seedFailedReply(cookie);
    failReplyMail();

    const res = await resend(cookie, inquiryId, replyId);
    expect(res.status).toBe(502);
    const body = (await res.json()) as { success: boolean; errors: string };
    expect(body.success).toBe(false);
    expect(body.errors).toBe("メールの送信に失敗しました。時間をおいて再送してください。");
    expect((await replyRow(replyId))?.mail_sent_at).toBeNull();
  });

  it("送信済みの返信は 409 で、もう一度は送らない", async () => {
    const cookie = await setupOwner();
    const id = await createInquiry();
    const body = (await (await postReply(cookie, id)).json()) as ReplyResponse;
    sendSpy.mockClear();

    const res = await resend(cookie, id, body.data.id);
    expect(res.status).toBe(409);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("メールアドレスの無い問い合わせの返信は 400", async () => {
    const cookie = await setupOwner();
    const id = await seedInquiryWithoutEmail();
    const body = (await (await postReply(cookie, id)).json()) as ReplyResponse;

    const res = await resend(cookie, id, body.data.id);
    expect(res.status).toBe(400);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("別の問い合わせの返信IDを指定すると 404", async () => {
    const cookie = await setupOwner();
    const { replyId } = await seedFailedReply(cookie);
    const otherId = await createInquiry("other@example.com");
    sendSpy.mockClear();

    const res = await resend(cookie, otherId, replyId);
    expect(res.status).toBe(404);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("member は 403、認証なしは 401", async () => {
    const cookie = await setupOwner();
    const { inquiryId, replyId } = await seedFailedReply(cookie);
    const member = await registerAndLogin("Member", `member${D}`);

    expect((await resend(member, inquiryId, replyId)).status).toBe(403);
    const anonymous = await app.request(`/api/inquiry/${inquiryId}/reply/${replyId}/mail`, {
      method: "POST",
      headers: { Origin: ORIGIN },
    });
    expect(anonymous.status).toBe(401);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("admin は再送できる", async () => {
    const cookie = await setupOwner();
    const { inquiryId, replyId } = await seedFailedReply(cookie);
    const adminCookie = await registerAndLogin("Admin", `admin${D}`, undefined, "admin");

    expect((await resend(adminCookie, inquiryId, replyId)).status).toBe(200);
  });
});
