// GET /api/trial-notices — 体験申込者への連絡の送信履歴（admin 以上）

import { count, getTableColumns } from "drizzle-orm";
import type { Context } from "hono";
import { desc, eq } from "../index.js";
import { admin, buildPagination, db, parsePage, trialNotice } from "../shared/index.js";

export async function getAll(c: Context) {
  const { page, limit, offset } = parsePage(c);

  const [rows, totalResult] = await Promise.all([
    db
      .select({ ...getTableColumns(trialNotice), admin_name: admin.name })
      .from(trialNotice)
      .leftJoin(admin, eq(trialNotice.admin_id, admin.id))
      .orderBy(desc(trialNotice.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(trialNotice),
  ]);
  const total = Number(totalResult[0]?.total ?? 0);

  const data = rows.map((row) => ({ ...row, admin_name: row.admin_name ?? "元管理者" }));

  return c.json(
    { success: true, data, pagination: buildPagination(page, limit, total) },
    200,
  );
}
