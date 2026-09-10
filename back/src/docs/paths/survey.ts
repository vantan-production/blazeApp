// アンケート／出欠確認のエンドポイント定義（/api/surveys）

import {
  errors,
  jsonBody,
  jsonResponse,
  listResponse,
  messageResponse,
  mutationResponse,
  pageParam,
  pathParam,
  str,
  type Paths,
} from "../components.js";
import { VALIDATION_LIMITS } from "../../db/schema.js";

const TAG = "アンケート";

const optionInput = {
  type: "object",
  required: ["label"],
  properties: {
    label: str(VALIDATION_LIMITS.surveyOptionLabel, "選択肢のラベル（例: 出席）"),
    sort_order: {
      type: "integer",
      minimum: 0,
      description: "表示順（省略時は配列の並び順）",
    },
  },
};

const surveyFields = {
  title: str(VALIDATION_LIMITS.surveyTitle, "アンケートのタイトル"),
  body: str(VALIDATION_LIMITS.body, "説明文（任意）"),
  closes_at: {
    type: ["string", "null"],
    format: "date-time",
    description: "回答締切（ISO 8601。null で締切なし）",
  },
  allow_multiple: {
    type: "boolean",
    description: "複数選択を許可するか（既定は false）",
  },
};

export const surveyPaths: Paths = {
  "/api/surveys": {
    get: {
      tags: [TAG],
      summary: "アンケート一覧（member 以上）",
      description:
        "作成日時の降順・1ページ10件。各件に自分が回答済みか（has_responded）と締切状態（is_closed）が付く。",
      parameters: [pageParam],
      responses: {
        "200": listResponse("取得成功", "#/components/schemas/SurveySummary"),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
    post: {
      tags: [TAG],
      summary: "アンケート作成（admin 以上）",
      description:
        "選択肢は2〜20個。出欠確認は options に「出席 / 欠席 / 未定」を入れて作る。",
      requestBody: jsonBody({
        type: "object",
        required: ["title", "options"],
        properties: {
          ...surveyFields,
          options: { type: "array", minItems: 2, maxItems: 20, items: optionInput },
        },
      }),
      responses: {
        "200": mutationResponse("作成成功", "#/components/schemas/Survey"),
        ...errors("BadRequest", "Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/surveys/{id}": {
    get: {
      tags: [TAG],
      summary: "アンケート詳細（member 以上）",
      description: "選択肢と、自分の回答（my_response）を返す。他人の回答は含まない。",
      parameters: [pathParam("id", "アンケートID")],
      responses: {
        "200": itemDetail(),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
    patch: {
      tags: [TAG],
      summary: "アンケート更新（admin 以上）",
      description:
        "送信したフィールドのみ更新する。options を送ると選択肢を総入れ替えするため、既存の回答も削除される。",
      parameters: [pathParam("id", "アンケートID")],
      requestBody: jsonBody({
        type: "object",
        properties: {
          ...surveyFields,
          options: { type: "array", minItems: 2, maxItems: 20, items: optionInput },
        },
      }),
      responses: {
        "200": mutationResponse("更新成功", "#/components/schemas/Survey"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
    delete: {
      tags: [TAG],
      summary: "アンケート削除（admin 以上）",
      description: "選択肢と回答も一緒に削除される。",
      parameters: [pathParam("id", "アンケートID")],
      responses: {
        "200": messageResponse("削除成功"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/surveys/{id}/responses": {
    post: {
      tags: [TAG],
      summary: "回答する（member 以上）",
      description:
        "送り直すと自分の回答を上書きする。締切を過ぎている場合・単一選択に2つ以上送った場合・他のアンケートの選択肢を含む場合は 400。",
      parameters: [pathParam("id", "アンケートID")],
      requestBody: jsonBody({
        type: "object",
        required: ["option_ids"],
        properties: {
          option_ids: {
            type: "array",
            minItems: 1,
            items: { type: "string", format: "uuid" },
            description: "選んだ選択肢のID（単一選択なら1つ）",
          },
          comment: str(
            { max: VALIDATION_LIMITS.surveyComment.max },
            "自由記述（任意）",
          ),
        },
      }),
      responses: {
        "200": jsonResponse("回答を受け付けた", {
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              option_ids: { type: "array", items: { type: "string", format: "uuid" } },
              comment: { type: ["string", "null"] },
            },
          },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/surveys/{id}/results": {
    get: {
      tags: [TAG],
      summary: "集計結果（admin 以上）",
      description:
        "選択肢ごとの票数と投票者、自由記述の一覧を返す。複数選択でも respondent_count は実人数を数える。",
      parameters: [pathParam("id", "アンケートID")],
      responses: {
        "200": jsonResponse("取得成功", {
          data: { $ref: "#/components/schemas/SurveyResults" },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/surveys/{id}/pending": {
    get: {
      tags: [TAG],
      summary: "未回答者一覧（admin 以上）",
      description:
        "まだ回答していないユーザーを返す。誰に催促すればよいかを把握するために使う。",
      parameters: [pathParam("id", "アンケートID")],
      responses: {
        "200": jsonResponse("取得成功", {
          data: {
            type: "object",
            properties: {
              total: { type: "integer", description: "対象ユーザー数" },
              responded_count: { type: "integer" },
              pending_count: { type: "integer" },
              pending: {
                type: "array",
                items: { $ref: "#/components/schemas/SurveyParticipant" },
              },
            },
          },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};

// 詳細レスポンス（選択肢と自分の回答を含む）
function itemDetail() {
  return jsonResponse("取得成功", {
    data: { $ref: "#/components/schemas/SurveyDetail" },
  });
}
