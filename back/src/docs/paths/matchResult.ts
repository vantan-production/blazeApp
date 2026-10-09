// 試合結果のエンドポイント定義（/api/match-results）

import {
  errors,
  itemResponse,
  jsonBody,
  listResponse,
  messageResponse,
  mutationResponse,
  pageParam,
  pathParam,
  str,
  type Paths,
} from "../components.js";
import { VALIDATION_LIMITS } from "../../db/schema.js";

const TAG = "試合結果";
const ITEM = "#/components/schemas/MatchResult";

const score = (description: string) => ({
  type: "integer",
  minimum: VALIDATION_LIMITS.score.min,
  maximum: VALIDATION_LIMITS.score.max,
  description,
});

const fields = {
  tournament_name: str(VALIDATION_LIMITS.tournamentName, "大会名"),
  tournament_result: {
    ...str(VALIDATION_LIMITS.tournamentResult, "大会での成績（任意。例: ベスト8）"),
    type: ["string", "null"],
  },
  played_on: { type: "string", format: "date", description: "試合日（YYYY-MM-DD）" },
  opponent_name: str(VALIDATION_LIMITS.opponentName, "対戦相手"),
  our_score: score("自チームの得点"),
  opponent_score: score("相手の得点"),
};

export const matchResultPaths: Paths = {
  "/api/match-results": {
    get: {
      tags: [TAG],
      summary: "試合結果一覧",
      description:
        "認証不要。試合日の新しい順（同じ日は登録の新しい順）・1ページ10件。公開サイトは先頭の1件を「前回の試合結果」に使う。",
      security: [],
      parameters: [pageParam],
      responses: {
        "200": listResponse("取得成功", ITEM),
      },
    },
    post: {
      tags: [TAG],
      summary: "試合結果を登録（admin 以上）",
      description: "tournament_result は省略・空文字なら「成績なし」（null）になる。",
      requestBody: jsonBody({
        type: "object",
        required: [
          "tournament_name",
          "played_on",
          "opponent_name",
          "our_score",
          "opponent_score",
        ],
        properties: fields,
      }),
      responses: {
        "200": mutationResponse("登録成功", ITEM),
        ...errors("BadRequest", "Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/match-results/{id}": {
    get: {
      tags: [TAG],
      summary: "試合結果の詳細",
      description: "認証不要。",
      security: [],
      parameters: [pathParam("id", "試合結果ID")],
      responses: {
        "200": itemResponse("取得成功", ITEM),
        ...errors("NotFound"),
      },
    },
    patch: {
      tags: [TAG],
      summary: "試合結果を更新（admin 以上）",
      description:
        "送信したフィールドのみ更新する。tournament_result に null か空文字を送ると成績を消せる。",
      parameters: [pathParam("id", "試合結果ID")],
      requestBody: jsonBody({ type: "object", properties: fields }),
      responses: {
        "200": mutationResponse("更新成功", ITEM),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
    delete: {
      tags: [TAG],
      summary: "試合結果を削除（admin 以上）",
      parameters: [pathParam("id", "試合結果ID")],
      responses: {
        "200": messageResponse("削除成功"),
        ...errors("Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};
