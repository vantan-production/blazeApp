// POST /api/inquiry/:id/reply — 問い合わせへの返信（管理者のみ）
//
// 返信を保存したあと、同じ内容を問い合わせ元のメールアドレスへ送る（replyMail.ts）。
// 送信に失敗しても返信は保存したまま 200 を返し、mail_status と message で管理画面に結果を伝える
// （失敗した返信は POST /api/inquiry/:id/reply/:reply_id/mail で再送できる）

import { z, eq } from "../index.js";
import {
  db,
  inquiry,
  reply,
  titleSchema,
  bodySchema,
  processImageUpload,
  processFileUpload,
} from "../shared/index.js";
import type { Context } from "hono";
import { deliverReplyMail, REPLY_MAIL_MESSAGES } from "./replyMail.js";

export const createReply = async (c: Context) => {
  const inquiryId = c.req.param("id");
  if (!inquiryId) {
    return c.json({ success: false, errors: "問い合わせIDが指定されていません。" }, 400);
  }

  const user = c.get("user") as { id: string };

  // 対象の問い合わせが存在するか確認
  const existing = await db.select().from(inquiry).where(eq(inquiry.id, inquiryId));
  const target = existing[0];
  if (!target) {
    return c.json({ success: false, errors: "問い合わせが見つかりません。" }, 404);
  }

  const body = await c.req.parseBody();

  const schema = z.object({ title: titleSchema, body: bodySchema });
  const result = schema.safeParse({ title: body["title"], body: body["body"] });

  if (!result.success) {
    return c.json(
      {
        success: false,
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
      400,
    );
  }

  const title = result.data.title;
  const bodyText = result.data.body;

  // 画像の処理（任意）
  let imgPath: string | null = null;
  const imageFile = body["image"];

  if (imageFile && imageFile instanceof File) {
    const imageResult = await processImageUpload(imageFile, `reply/${inquiryId}`);
    if (!imageResult.success) {
      return c.json({ success: false, errors: imageResult.error }, imageResult.status);
    }
    imgPath = imageResult.path;
  }

  // ファイルの処理（任意）
  let filePath: string | null = null;
  const fileUpload = body["file"];

  if (fileUpload && fileUpload instanceof File) {
    const fileResult = await processFileUpload(fileUpload, `reply/${inquiryId}/files`);
    if (!fileResult.success) {
      return c.json({ success: false, errors: fileResult.error }, fileResult.status);
    }
    filePath = fileResult.path;
  }

  const inserted = await db
    .insert(reply)
    .values({
      inquiry_id: inquiryId,
      admin_id: user.id,
      title,
      body: bodyText,
      img: imgPath,
      file: filePath,
    })
    .returning();
  const saved = inserted[0];
  if (!saved) throw new Error("返信の保存に失敗しました。");

  const { status, reply: delivered } = await deliverReplyMail(target, saved);

  return c.json(
    { success: true, message: REPLY_MAIL_MESSAGES[status], mail_status: status, data: delivered },
    200,
  );
};
