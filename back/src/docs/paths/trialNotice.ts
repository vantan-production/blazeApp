// 体験申込者への連絡のエンドポイント定義（/api/trial-notices）

import { VALIDATION_LIMITS } from "../../db/schema.js";
import {
  errors,
  jsonBody,
  jsonResponse,
  listResponse,
  type Paths,
  pageParam,
  pathParam,
  str,
} from "../components.js";

const TAG = "体験申込者への連絡";

const NOTICE_REF = "#/components/schemas/TrialNotice";
const RECIPIENT_REF = "#/components/schemas/TrialNoticeRecipient";

const recipientList = (description: string) => ({
  type: "array",
  items: { $ref: RECIPIENT_REF },
  description,
});

// 送信結果（成功・一部失敗・全件失敗で共通の形）
const sendResult = (noticeNullable: boolean) => ({
  type: "object",
  properties: {
    notice: noticeNullable ? { type: "null" } : { $ref: NOTICE_REF },
    sent: recipientList("送信に成功した申込（sent_at は含まない）"),
    failed: recipientList("3回試しても送信できなかった申込。再送時はこの application_id を選び直して POST する"),
  },
});

export const trialNoticePaths: Paths = {
  "/api/trial-notices/candidates": {
    get: {
      tags: [TAG],
      summary: "送信先に選べる体験申込者（admin 以上）",
      description:
        "trial_date を指定すればその体験日の申込者、省略すれば今日（日本時間）以降に体験予定の申込者。体験日の昇順→フリガナ→氏名の順。件数が少ない想定のためページネーションせず全件返す。",
      parameters: [
        {
          name: "trial_date",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
          description: "体験日（YYYY-MM-DD）。省略で今日以降の申込者",
        },
      ],
      responses: {
        "200": jsonResponse("取得成功", {
          data: { type: "array", items: { $ref: "#/components/schemas/TrialNoticeCandidate" } },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/trial-notices": {
    get: {
      tags: [TAG],
      summary: "送信履歴（admin 以上）",
      description: "送信日時の降順・1ページ10件。送信に1件も成功しなかった連絡は残らない。",
      parameters: [pageParam],
      responses: {
        "200": listResponse("取得成功", NOTICE_REF),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
    post: {
      tags: [TAG],
      summary: "選んだ体験申込者へ連絡メールを送信（admin 以上）",
      description:
        "application_ids の申込者へ1人ずつ個別に送信し、他の申込者のアドレスは見えない。同じメールアドレス（前後の空白・大文字小文字は区別しない）の申込は1通にまとめ、届けばまとめた申込すべてを sent に含める。失敗した送信は最大3回まで自動でやり直す。履歴には成功した宛先だけを保存し、全件失敗なら何も保存せず 502。存在しない申込IDが含まれていれば何も送らず 400。",
      requestBody: jsonBody({
        type: "object",
        required: ["title", "body", "application_ids"],
        properties: {
          title: str(VALIDATION_LIMITS.title, "件名（メール件名にも使う）"),
          body: str(VALIDATION_LIMITS.body, "本文（改行はそのまま反映される）"),
          application_ids: {
            type: "array",
            items: { type: "string", format: "uuid" },
            minItems: 1,
            maxItems: 100,
            uniqueItems: true,
            description: "送信先の体験申込ID",
          },
        },
      }),
      responses: {
        "200": jsonResponse(
          "送信完了（一部失敗を含む）。message は「N件送信しました。」または「N件中M件の送信に失敗しました。失敗した方に再送してください。」（件数はメールの通数）",
          { message: { type: "string" }, data: sendResult(false) },
        ),
        "502": {
          description: "全件の送信に失敗（何も保存しない）",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", const: false },
                  errors: { type: "string" },
                  data: sendResult(true),
                },
              },
            },
          },
        },
        ...errors("BadRequest", "Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/trial-notices/{id}": {
    get: {
      tags: [TAG],
      summary: "送信履歴の詳細と宛先（admin 以上）",
      description: "宛先は送信に成功した申込のみ（送信時点の氏名・アドレス・体験日）。",
      parameters: [pathParam("id", "連絡ID")],
      responses: {
        "200": jsonResponse("取得成功", {
          data: {
            allOf: [
              { $ref: NOTICE_REF },
              {
                type: "object",
                properties: { recipients: recipientList("送信に成功した宛先（送信順）") },
              },
            ],
          },
        }),
        ...errors("Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};
