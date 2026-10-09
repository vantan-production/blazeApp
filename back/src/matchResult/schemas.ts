// 試合結果APIのリクエストスキーマ（作成・更新で共有する）

import { z } from "../index.js";
import {
  opponentNameSchema,
  playedOnSchema,
  scoreSchema,
  tournamentNameSchema,
  tournamentResultSchema,
  VALIDATION_LIMITS,
} from "../shared/index.js";

const MAX_SETS = VALIDATION_LIMITS.matchSets.max;

const setSchema = z.object({
  our_score: scoreSchema("自チームの得点"),
  opponent_score: scoreSchema("相手の得点"),
});

// セットごとの得点（決勝の3セットマッチまで）
const setsSchema = z
  .array(setSchema, { message: "得点はセットごとの配列で送ってください。" })
  .max(MAX_SETS, `得点は${MAX_SETS}セットまで入力できます。`);

// 対戦相手は任意。null・空文字・省略は「対戦相手なし」として扱う
const opponentSchema = opponentNameSchema.nullable();

/**
 * 対戦相手と得点の組み合わせを確かめる。
 * 対戦相手があるときは1セット以上の得点が必要で、無いときは得点を持たない
 */
export const checkOpponentAndSets = (
  data: { opponent_name?: string | null | undefined; sets?: unknown[] | undefined },
  ctx: z.RefinementCtx,
) => {
  const hasOpponent = Boolean(data.opponent_name);
  const setCount = data.sets?.length ?? 0;
  if (hasOpponent && setCount === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["sets"],
      message: "対戦相手を入力したときは、得点を1セット以上入力してください。",
    });
  }
  if (!hasOpponent && setCount > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["opponent_name"],
      message: "得点を入力するときは、対戦相手も入力してください。",
    });
  }
};

export const createMatchResultSchema = z
  .object({
    tournament_name: tournamentNameSchema,
    // 空文字・省略は「成績なし」として扱う
    tournament_result: tournamentResultSchema,
    played_on: playedOnSchema,
    opponent_name: opponentSchema,
    sets: setsSchema.optional(),
  })
  .superRefine(checkOpponentAndSets);

// 更新は送信されたフィールドのみ変更する。大会成績は null か空文字で消せる。
// 対戦相手と得点は組み合わせで意味を持つため、ハンドラで「両方そろえて送られたか」を確かめてから
// checkOpponentAndSets で組み合わせを検証する
export const updateMatchResultSchema = z.object({
  tournament_name: tournamentNameSchema.optional(),
  tournament_result: tournamentResultSchema.nullable(),
  played_on: playedOnSchema.optional(),
  opponent_name: opponentSchema,
  sets: setsSchema.optional(),
});

// 更新で対戦相手と得点を送ったときの組み合わせの検証（両方そろっている前提）
export const opponentAndSetsSchema = z
  .object({ opponent_name: opponentSchema, sets: setsSchema })
  .superRefine(checkOpponentAndSets);

/** zod の失敗をAPI共通のエラー形式に変換する */
export const toFieldErrors = (error: z.ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
