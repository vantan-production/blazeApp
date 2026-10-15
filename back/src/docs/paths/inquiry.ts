// 問い合わせのエンドポイント定義（/api/inquiry）

import {
  errors,
  fields,
  formBody,
  jsonBody,
  jsonResponse,
  listResponse,
  messageResponse,
  mutationResponse,
  pageParam,
  pathParam,
  type Paths,
} from "../components.js";

const TAG = "問い合わせ";

export const inquiryPaths: Paths = {
  "/api/inquiry": {
    get: {
      tags: [TAG],
      summary: "問い合わせ一覧（admin 以上）",
      description: "受信日時の降順・1ページ10件。status で対応状況の絞り込みができる。",
      parameters: [
        pageParam,
        {
          name: "status",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["pending", "in_progress", "resolved"] },
          description: "対応ステータスで絞り込む（未指定なら全件）",
        },
      ],
      responses: {
        "200": listResponse("取得成功", "#/components/schemas/Inquiry"),
        ...errors("BadRequest", "Unauthorized", "Forbidden"),
      },
    },
    post: {
      tags: [TAG],
      summary: "問い合わせ送信（認証不要）",
      description:
        "送信後、入力されたメールアドレス宛に自動返信メールを送る（送信失敗時も問い合わせ自体は成功扱い）。レートリミット: 1分に1回。",
      security: [],
      requestBody: formBody({
        type: "object",
        required: ["name", "email", "title", "body"],
        properties: {
          name: fields.inquiryName,
          email: fields.email,
          title: fields.title,
          body: fields.body,
          image: fields.image,
        },
      }),
      responses: {
        "200": mutationResponse("送信成功", "#/components/schemas/Inquiry"),
        ...errors("BadRequest", "TooManyRequests"),
      },
    },
  },

  "/api/inquiry/{id}": {
    get: {
      tags: [TAG],
      summary: "問い合わせ詳細（admin 以上）",
      description: "返信履歴も併せて返す。",
      parameters: [pathParam("id", "問い合わせID")],
      responses: {
        "200": jsonResponse("取得成功", {
          data: {
            allOf: [
              { $ref: "#/components/schemas/Inquiry" },
              {
                type: "object",
                properties: {
                  replies: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Reply" },
                  },
                },
              },
            ],
          },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/inquiry/{id}/status": {
    patch: {
      tags: [TAG],
      summary: "対応ステータスの更新（admin 以上）",
      description: "pending（未対応）/ in_progress（対応中）/ resolved（対応済み）を切り替える。",
      parameters: [pathParam("id", "問い合わせID")],
      requestBody: jsonBody({
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["pending", "in_progress", "resolved"],
            description: "更新後の対応ステータス",
          },
        },
      }),
      responses: {
        "200": mutationResponse("更新成功", "#/components/schemas/Inquiry"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/inquiry/{id}/reply": {
    post: {
      tags: [TAG],
      summary: "問い合わせへの返信（admin 以上）",
      description:
        "返信を保存し、同じ内容を問い合わせ元のメールアドレスへ送信する（元の問い合わせ内容を引用し、添付した画像・ファイルもメールに添付する）。送信に失敗しても返信は保存したまま 200 を返し、mail_status で結果を伝える。失敗した返信は POST /api/inquiry/{id}/reply/{reply_id}/mail で再送できる。",
      parameters: [pathParam("id", "問い合わせID")],
      requestBody: formBody({
        type: "object",
        required: ["title", "body"],
        properties: {
          title: fields.title,
          body: fields.body,
          image: fields.image,
          file: fields.file,
        },
      }),
      responses: {
        "200": jsonResponse(
          "返信成功（メール送信の成否を含む）。message は mail_status に応じた文言",
          {
            message: { type: "string" },
            mail_status: {
              type: "string",
              enum: ["sent", "failed", "no_address"],
              description:
                "sent: 送信済み / failed: 送信失敗（再送できる） / no_address: 問い合わせにメールアドレスが無く送信していない",
            },
            data: { $ref: "#/components/schemas/Reply" },
          },
        ),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/inquiry/{id}/reply/{reply_id}/mail": {
    post: {
      tags: [TAG],
      summary: "返信メールの再送（admin 以上）",
      description:
        "投稿時にメール送信が失敗した返信（mail_sent_at が null）を、問い合わせ元へもう一度送る。送信済みなら 409、問い合わせにメールアドレスが無ければ 400、送信に失敗したら 502。",
      parameters: [
        pathParam("id", "問い合わせID"),
        pathParam("reply_id", "返信ID"),
      ],
      responses: {
        "200": mutationResponse("送信成功", "#/components/schemas/Reply"),
        "502": {
          description: "メールの送信に失敗（mail_sent_at は null のまま）",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
          },
        },
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound", "Conflict"),
      },
    },
  },

  "/api/inquiry/{id}/reply/{reply_id}": {
    delete: {
      tags: [TAG],
      summary: "返信の削除（admin 以上）",
      parameters: [
        pathParam("id", "問い合わせID"),
        pathParam("reply_id", "返信ID"),
      ],
      responses: {
        "200": messageResponse("削除成功"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};
