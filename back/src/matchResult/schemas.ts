// 試合結果APIのリクエストスキーマ（作成・更新で共有する）

import { z } from "../index.js";
import {
  opponentNameSchema,
  playedOnSchema,
  scoreSchema,
  tournamentNameSchema,
  tournamentResultSchema,
} from "../shared/index.js";

export const createMatchResultSchema = z.object({
  tournament_name: tournamentNameSchema,
  // 空文字・省略は「成績なし」として扱う
  tournament_result: tournamentResultSchema,
  played_on: playedOnSchema,
  opponent_name: opponentNameSchema,
  our_score: scoreSchema("自チームの得点"),
  opponent_score: scoreSchema("相手の得点"),
});

// 更新は送信されたフィールドのみ変更する。大会成績は null か空文字で消せる
export const updateMatchResultSchema = z.object({
  tournament_name: tournamentNameSchema.optional(),
  tournament_result: tournamentResultSchema.nullable(),
  played_on: playedOnSchema.optional(),
  opponent_name: opponentNameSchema.optional(),
  our_score: scoreSchema("自チームの得点").optional(),
  opponent_score: scoreSchema("相手の得点").optional(),
});

/** zod の失敗をAPI共通のエラー形式に変換する */
export const toFieldErrors = (error: z.ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
