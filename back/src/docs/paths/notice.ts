// 関係者限定お知らせのエンドポイント定義（/api/notices）
// news テーブルの type='notice' を使うため、レスポンスは NewsPost を流用する。

import {
  errors,
  fields,
  formBody,
  itemResponse,
  jsonResponse,
  listResponse,
  messageResponse,
  mutationResponse,
  pageParam,
  pathParam,
  type Paths,
} from "../components.js";

const TAG = "関係者限定お知らせ";

export const noticePaths: Paths = {
  "/api/notices": {
    get: {
      tags: [TAG],
      summary: "お知らせ一覧（member 以上）",
      description:
        "作成日時の降順・1ページ10件。各件に自分の既読状態（is_read / read_at）が付く。",
      parameters: [pageParam],
      responses: {
        "200": listResponse("取得成功", "#/components/schemas/Notice"),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
    post: {
      tags: [TAG],
      summary: "お知らせ投稿（admin 以上）",
      description:
        "type='notice' として作成され、公開範囲は常に member（関係者限定）になる。",
      requestBody: formBody({
        type: "object",
        required: ["title", "body"],
        properties: {
          title: fields.title,
          body: fields.body,
          category: fields.category,
          image: fields.image,
        },
      }),
      responses: {
        "200": mutationResponse("投稿成功", "#/components/schemas/NewsPost"),
        ...errors("BadRequest", "Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/notices/{id}": {
    get: {
      tags: [TAG],
      summary: "お知らせ詳細（member 以上）",
      parameters: [pathParam("id", "お知らせのID")],
      responses: {
        "200": itemResponse("取得成功", "#/components/schemas/NewsPost"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
    patch: {
      tags: [TAG],
      summary: "お知らせ更新（admin 以上）",
      description: "送信したフィールドのみ更新する。公開範囲は変更できない。",
      parameters: [pathParam("id", "お知らせのID")],
      requestBody: formBody({
        type: "object",
        properties: {
          title: fields.title,
          body: fields.body,
          category: fields.category,
          image: fields.image,
        },
      }),
      responses: {
        "200": mutationResponse("更新成功", "#/components/schemas/NewsPost"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
    delete: {
      tags: [TAG],
      summary: "お知らせ削除（admin 以上）",
      parameters: [pathParam("id", "お知らせのID")],
      responses: {
        "200": messageResponse("削除成功"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/notices/{id}/read": {
    post: {
      tags: [TAG],
      summary: "既読をつける（member 以上）",
      description:
        "何度呼んでも初回の既読日時を保つ（同じ利用者の重複記録は作られない）。",
      parameters: [pathParam("id", "お知らせのID")],
      responses: {
        "200": jsonResponse("既読を記録", {
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              read_at: { type: "string", format: "date-time" },
            },
          },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/notices/{id}/reads": {
    get: {
      tags: [TAG],
      summary: "既読状況（admin 以上）",
      description:
        "既読者と未読者の両方を返す。対象は削除済みを除く全ユーザー（owner / admin / member）。誰に催促すればよいかを把握するために使う。",
      parameters: [pathParam("id", "お知らせのID")],
      responses: {
        "200": jsonResponse("取得成功", {
          data: {
            type: "object",
            properties: {
              total: { type: "integer", description: "対象ユーザー数" },
              read_count: { type: "integer" },
              unread_count: { type: "integer" },
              read: {
                type: "array",
                items: { $ref: "#/components/schemas/NoticeReader" },
              },
              unread: {
                type: "array",
                items: { $ref: "#/components/schemas/NoticeReader" },
              },
            },
          },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};
