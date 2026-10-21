// PATCH /api/inquiry/:id/status — 問い合わせの対応ステータスを更新（管理者のみ）

import { eq } from "../index.js";
import { db, inquiry, inquiryStatusSchema, INQUIRY_STATUS_LABELS } from "../shared/index.js";
import type { Context } from "hono";

export const updateStatus = async (c: Context) => {
  const id = c.req.param("id");
  if (!id) return c.json({ success: false, errors: "IDが指定されていません。" }, 400);

  const existing = await db.select().from(inquiry).where(eq(inquiry.id, id));
  if (existing.length === 0) {
    return c.json({ success: false, errors: "問い合わせが見つかりません。" }, 404);
  }

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const parsed = inquiryStatusSchema.safeParse(body.status);
  if (!parsed.success) {
    return c.json(
      { success: false, errors: "status は pending / in_progress / resolved のいずれかです。" },
      400,
    );
  }

  const updated = await db
    .update(inquiry)
    .set({ status: parsed.data })
    .where(eq(inquiry.id, id))
    .returning();

  return c.json(
    {
      success: true,
      message: `対応ステータスを「${INQUIRY_STATUS_LABELS[parsed.data]}」に更新しました。`,
      data: updated[0],
    },
    200,
  );
};
