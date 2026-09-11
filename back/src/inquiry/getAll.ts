// GET /api/inquiry — 全ての問い合わせを取得（管理者のみ）
// ?status=pending|in_progress|resolved で対応ステータスによる絞り込みが可能

import { desc, eq } from "../index.js";
import { count } from "drizzle-orm";
import {
  db,
  inquiry,
  inquiryStatusSchema,
  toMediaUrl,
  parsePage,
  buildPagination,
} from "../shared/index.js";
import type { Context } from "hono";

export const getAll = async (c: Context) => {
  const { page, limit, offset } = parsePage(c);

  // ステータス絞り込み（未指定なら絞り込まない）
  const statusQuery = c.req.query("status");
  const parsedStatus = statusQuery ? inquiryStatusSchema.safeParse(statusQuery) : null;

  if (statusQuery && !parsedStatus?.success) {
    return c.json(
      { success: false, errors: "status は pending / in_progress / resolved のいずれかです。" },
      400,
    );
  }

  const statusFilter = parsedStatus?.success ? eq(inquiry.status, parsedStatus.data) : undefined;

  const [allInquiries, totalResult] = await Promise.all([
    db
      .select()
      .from(inquiry)
      .where(statusFilter)
      .orderBy(desc(inquiry.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(inquiry).where(statusFilter),
  ]);
  const total = Number(totalResult[0]?.total ?? 0);

  // 画像の署名付きURLを付与
  const inquiriesWithUrls = await Promise.all(
    allInquiries.map(async (item) => ({
      ...item,
      img_url: await toMediaUrl(item.img),
    })),
  );

  return c.json(
    {
      success: true,
      data: inquiriesWithUrls,
      pagination: buildPagination(page, limit, total),
    },
    200,
  );
};
