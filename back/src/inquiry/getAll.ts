// GET /api/inquiry — 全ての問い合わせを取得（管理者のみ）
// ?status=pending|in_progress|resolved で対応ステータスによる絞り込みが可能
// ?q= で名前・メールアドレス・件名・本文の部分一致検索が可能（status と併用できる）
// 管理画面のタブに出す件数として、検索条件だけを適用したステータスごとの件数（counts）も返す

import { and, desc, eq } from "../index.js";
import { count, ilike, or } from "drizzle-orm";
import {
  db,
  inquiry,
  inquiryStatusSchema,
  toMediaUrl,
  parsePage,
  buildPagination,
} from "../shared/index.js";
import type { InquiryStatus } from "../db/schema.js";
import type { Context } from "hono";

// 検索語の上限（件名の上限100文字に合わせる。長すぎる検索語は 400）
const SEARCH_MAX_LENGTH = 100;

/** LIKE のワイルドカード（% _）とエスケープ文字（\）を、ただの文字として扱えるようにする */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (ch) => `\\${ch}`);

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

  // 検索語（前後の空白は除き、空なら検索しない）
  const keyword = c.req.query("q")?.trim() ?? "";
  if (keyword.length > SEARCH_MAX_LENGTH) {
    return c.json(
      { success: false, errors: `検索語は${SEARCH_MAX_LENGTH}文字以内で入力してください。` },
      400,
    );
  }

  // PostgreSQL の LIKE は「\」が既定のエスケープ文字なので、escapeLike した語をそのまま渡せる
  const pattern = `%${escapeLike(keyword)}%`;
  const searchFilter = keyword
    ? or(
        ilike(inquiry.name, pattern),
        ilike(inquiry.email, pattern),
        ilike(inquiry.title, pattern),
        ilike(inquiry.body, pattern),
      )
    : undefined;
  const statusFilter = parsedStatus?.success ? eq(inquiry.status, parsedStatus.data) : undefined;
  const filter = and(searchFilter, statusFilter);

  const [allInquiries, totalResult, statusCounts] = await Promise.all([
    db
      .select()
      .from(inquiry)
      .where(filter)
      .orderBy(desc(inquiry.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(inquiry).where(filter),
    // タブの件数は表示中のタブに関係なく出すため、ステータスでは絞らない
    db
      .select({ status: inquiry.status, total: count() })
      .from(inquiry)
      .where(searchFilter)
      .groupBy(inquiry.status),
  ]);
  const total = Number(totalResult[0]?.total ?? 0);

  const counts: Record<InquiryStatus | "all", number> = {
    all: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
  };
  for (const row of statusCounts) {
    const parsed = inquiryStatusSchema.safeParse(row.status);
    if (!parsed.success) continue;
    counts[parsed.data] = Number(row.total);
    counts.all += Number(row.total);
  }

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
      counts,
    },
    200,
  );
};
