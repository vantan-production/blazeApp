// POST /api/inquiry/:id/reply/:reply_id/mail — 送れなかった返信メールを再送（管理者のみ）
//
// 返信の投稿時にメール送信が失敗した場合に、管理画面から同じ返信をもう一度送る。
// 送信済みの返信は二重に届かないよう 409 で断る。全く届かなければ体験申込者への連絡と同じく 502

import { and, eq } from "../index.js";
import { db, inquiry, reply } from "../shared/index.js";
import type { Context } from "hono";
import { deliverReplyMail } from "./replyMail.js";

export const resendReplyMail = async (c: Context) => {
  const inquiryId = c.req.param("id");
  const replyId = c.req.param("reply_id");
  if (!inquiryId || !replyId) {
    return c.json({ success: false, errors: "返信IDが指定されていません。" }, 400);
  }

  const target = (await db.select().from(inquiry).where(eq(inquiry.id, inquiryId)))[0];
  // 別の問い合わせの返信IDを指定された場合も、その問い合わせの返信としては存在しないので 404
  const row = (
    await db
      .select()
      .from(reply)
      .where(and(eq(reply.id, replyId), eq(reply.inquiry_id, inquiryId)))
  )[0];
  if (!target || !row) {
    return c.json({ success: false, errors: "返信が見つかりません。" }, 404);
  }

  if (row.mail_sent_at) {
    return c.json({ success: false, errors: "この返信はすでにメールで送信済みです。" }, 409);
  }

  const { status, reply: delivered } = await deliverReplyMail(target, row);

  if (status === "no_address") {
    return c.json(
      { success: false, errors: "問い合わせにメールアドレスが無いため送信できません。" },
      400,
    );
  }
  if (status === "failed") {
    return c.json(
      { success: false, errors: "メールの送信に失敗しました。時間をおいて再送してください。" },
      502,
    );
  }

  return c.json(
    { success: true, message: "返信メールを送信しました。", data: delivered },
    200,
  );
};
