// 問い合わせへの返信を、問い合わせ元のメールアドレスへ送る（返信の投稿時と、管理画面からの再送で使う）
//
// - 返信は送信の成否にかかわらず保存済みのものを受け取る。届いたら reply.mail_sent_at を記録し、
//   届かなかった返信は NULL のまま残して管理画面から再送できるようにする
//   （体験申込者への連絡と同じく、届いていないメールが「送信済み」に見えないように）
// - 返信に添付した画像・ファイルは S3 から取り出してメールに添付する
//   （管理画面の署名付きURLは期限付きで、問い合わせ元はログインもできないため）
// - 応答が返ってこない送信は SEND_TIMEOUT_MS で打ち切り、失敗として扱う。
//   打ち切った送信は実際には届いている可能性があるため、返信IDから作った冪等キーを付けて送る。
//   再送しても Resend が24時間は二重に配信しない

import { eq } from "../index.js";
import {
  db,
  downloadFromS3,
  type inquiry,
  reply,
  sendInquiryReplyEmail,
} from "../shared/index.js";
import type { MailAttachment } from "../utils/mail.js";
import { logAppError } from "../utils/monitoring.js";
import { withTimeout } from "../utils/timeout.js";

type InquiryRow = typeof inquiry.$inferSelect;
type ReplyRow = typeof reply.$inferSelect;

// sent: 届いた / failed: 送信に失敗した（再送できる） / no_address: 問い合わせにメールアドレスが無い
export type ReplyMailStatus = "sent" | "failed" | "no_address";

// 送信1回あたりの待ち時間の上限
const SEND_TIMEOUT_MS = 10_000;
// テストでは応答のない送信を短い時間で打ち切る（10秒待たないように）
const sendTimeoutMs = () => (process.env.NODE_ENV === "test" ? 50 : SEND_TIMEOUT_MS);

/** S3 のパスから添付ファイル名を作る（processFileUpload が付けた「タイムスタンプ_」は外す） */
function attachmentName(path: string, fallback: string): string {
  const base = path.split("/").pop() ?? "";
  const name = base.replace(/^\d+_/, "").replace(/[\r\n]+/g, " ");
  return name || fallback;
}

/** 返信に添付された画像・ファイルを S3 から取り出す */
async function loadAttachments(row: ReplyRow): Promise<MailAttachment[]> {
  const attachments: MailAttachment[] = [];
  if (row.img) {
    // 画像は WebP 等に変換済みで元のファイル名が残っていないため、拡張子だけ引き継ぐ
    const ext = row.img.split(".").pop();
    attachments.push({
      filename: ext ? `image.${ext}` : "image",
      content: await downloadFromS3(row.img),
    });
  }
  if (row.file) {
    attachments.push({
      filename: attachmentName(row.file, "attachment"),
      content: await downloadFromS3(row.file),
    });
  }
  return attachments;
}

/**
 * 返信メールを問い合わせ元に送り、届いたら mail_sent_at を記録する
 * 送信に失敗しても例外は投げず、status で結果を返す（返信自体は保存済みのため）
 * @returns 送信結果と、mail_sent_at を反映した返信
 */
export async function deliverReplyMail(
  target: InquiryRow,
  row: ReplyRow,
): Promise<{ status: ReplyMailStatus; reply: ReplyRow }> {
  // email 欄を追加する前の問い合わせには宛先が無い（schema.ts の inquiry.email 参照）
  const to = target.email?.trim();
  if (!to) return { status: "no_address", reply: row };

  try {
    const attachments = await loadAttachments(row);
    await withTimeout(
      sendInquiryReplyEmail(
        to,
        {
          name: target.name,
          inquiryTitle: target.title,
          inquiryBody: target.body,
          replyTitle: row.title,
          replyBody: row.body,
        },
        attachments,
        { idempotencyKey: `inquiry-reply/${row.id}` },
      ),
      sendTimeoutMs(),
    );
  } catch (e) {
    // 宛先アドレスは個人情報なのでログには出さない。問い合わせ・返信のIDで追えるようにする
    logAppError("inquiry.replyMail", e, { inquiry_id: target.id, reply_id: row.id });
    return { status: "failed", reply: row };
  }

  const updated = await db
    .update(reply)
    .set({ mail_sent_at: new Date() })
    .where(eq(reply.id, row.id))
    .returning();
  return { status: "sent", reply: updated[0] ?? row };
}

/** 送信結果ごとの、管理画面に出す文言 */
export const REPLY_MAIL_MESSAGES: Record<ReplyMailStatus, string> = {
  sent: "返信を投稿し、問い合わせ元にメールを送信しました。",
  failed: "返信を投稿しましたが、メールの送信に失敗しました。時間をおいて再送してください。",
  no_address: "返信を投稿しました（問い合わせにメールアドレスが無いため、メールは送信していません）。",
};
