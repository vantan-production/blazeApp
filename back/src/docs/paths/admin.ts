// 管理者・認証まわりのエンドポイント定義（/api/admin/*）

import {
  errors,
  fields,
  jsonBody,
  jsonResponse,
  messageResponse,
  pathParam,
  type Paths,
} from "../components.js";

const TAG = "管理者・認証";

export const adminPaths: Paths = {
  "/api/admin/register": {
    post: {
      tags: [TAG],
      summary: "管理者登録",
      description:
        "初回登録者は owner、以降は member として登録される。成功時は token が HttpOnly Cookie で発行される。レートリミット: 1分に1回。",
      security: [],
      requestBody: jsonBody({
        type: "object",
        required: ["name", "email", "password", "passwordConfirmation"],
        properties: {
          name: fields.adminName,
          email: fields.email,
          password: fields.password,
          passwordConfirmation: { type: "string", description: "確認用パスワード" },
        },
      }),
      responses: {
        "200": jsonResponse("登録成功（Cookie にトークンを発行）", {
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string", format: "email" },
            },
          },
        }),
        ...errors("BadRequest", "Conflict", "TooManyRequests"),
      },
    },
  },

  "/api/admin/login": {
    post: {
      tags: [TAG],
      summary: "ログイン",
      description:
        "成功時に token を HttpOnly Cookie で発行する。レートリミット: 1分に5回。",
      security: [],
      requestBody: jsonBody({
        type: "object",
        required: ["email", "password"],
        properties: { email: fields.email, password: fields.password },
      }),
      responses: {
        "200": jsonResponse("ログイン成功", {
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string", format: "email" },
            },
          },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "TooManyRequests"),
      },
    },
  },

  "/api/admin/logout": {
    post: {
      tags: [TAG],
      summary: "ログアウト",
      description: "DB上のトークンを削除し、Cookie も破棄する。",
      responses: {
        "200": messageResponse("ログアウト成功"),
        ...errors("Unauthorized"),
      },
    },
  },

  "/api/admin/me": {
    get: {
      tags: [TAG],
      summary: "ログイン中のユーザー情報",
      description: "フロント側のログイン判定に使用する。",
      responses: {
        "200": jsonResponse("取得成功", {
          data: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              email: { type: "string", format: "email" },
              role: { type: "string", enum: ["owner", "admin", "member"] },
            },
          },
        }),
        ...errors("Unauthorized"),
      },
    },
  },

  "/api/admin/account-delete": {
    delete: {
      tags: [TAG],
      summary: "自アカウントの削除（ソフトデリート）",
      description:
        "deleted_at を立てるのみ。30日以内なら account-recover で復活できる。",
      requestBody: jsonBody({
        type: "object",
        required: ["password"],
        properties: { password: fields.password },
      }),
      responses: {
        "200": messageResponse("削除成功"),
        ...errors("BadRequest", "Unauthorized"),
      },
    },
  },

  "/api/admin/account-recover": {
    post: {
      tags: [TAG],
      summary: "削除済みアカウントの復活",
      description: "削除から30日以内のアカウントのみ復活可能。レートリミット: 1分に3回。",
      security: [],
      requestBody: jsonBody({
        type: "object",
        required: ["email", "password"],
        properties: { email: fields.email, password: fields.password },
      }),
      responses: {
        "200": messageResponse("復活成功"),
        ...errors("BadRequest", "Unauthorized", "TooManyRequests"),
      },
    },
  },

  "/api/admin/forgot-password": {
    post: {
      tags: [TAG],
      summary: "パスワード再設定メールの送信",
      description:
        "アカウントの有無にかかわらず同じ文言を返す（メールアドレス列挙対策）。レートリミット: 1分に3回。",
      security: [],
      requestBody: jsonBody({
        type: "object",
        required: ["email"],
        properties: { email: fields.email },
      }),
      responses: {
        "200": messageResponse("送信受付（存在しないアドレスでも同じ応答）"),
        ...errors("BadRequest", "TooManyRequests"),
      },
    },
  },

  "/api/admin/reset-password": {
    post: {
      tags: [TAG],
      summary: "トークンによるパスワード再設定",
      description:
        "メールで届いた生トークンを使う。有効期限1時間・使用済みトークンは再利用不可。レートリミット: 1分に5回。",
      security: [],
      requestBody: jsonBody({
        type: "object",
        required: ["token", "password", "passwordConfirmation"],
        properties: {
          token: { type: "string", description: "再設定メールに記載のトークン" },
          password: fields.password,
          passwordConfirmation: { type: "string" },
        },
      }),
      responses: {
        "200": messageResponse("再設定成功"),
        ...errors("BadRequest", "TooManyRequests"),
      },
    },
  },

  "/api/admin/users": {
    get: {
      tags: [TAG],
      summary: "ユーザー一覧（owner のみ）",
      responses: {
        "200": jsonResponse("取得成功", {
          total: { type: "integer" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/AdminUser" },
          },
        }),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/admin/users/{userId}/role": {
    patch: {
      tags: [TAG],
      summary: "ロール変更（owner のみ）",
      parameters: [pathParam("userId", "対象ユーザーID")],
      requestBody: jsonBody({
        type: "object",
        required: ["role"],
        properties: {
          role: { type: "string", enum: ["owner", "admin", "member"] },
        },
      }),
      responses: {
        "200": messageResponse("変更成功"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/admin/users/{userId}/delete-request": {
    post: {
      tags: [TAG],
      summary: "他者アカウント削除リクエストの作成（owner のみ）",
      description: "owner 全員の承認が揃うと対象をソフトデリートする。24時間で失効。",
      parameters: [pathParam("userId", "削除対象ユーザーID")],
      responses: {
        "200": messageResponse("リクエスト作成"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound", "Conflict"),
      },
    },
  },

  "/api/admin/delete-requests": {
    get: {
      tags: [TAG],
      summary: "承認待ちの削除リクエスト一覧（owner のみ）",
      responses: {
        "200": jsonResponse("取得成功", {
          total: { type: "integer" },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/DeletionRequest" },
          },
        }),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/admin/delete-requests/{requestId}/approve": {
    post: {
      tags: [TAG],
      summary: "削除リクエストの承認（owner のみ）",
      description: "owner 全員の承認が揃った時点で対象アカウントを削除する。",
      parameters: [pathParam("requestId", "削除リクエストID")],
      responses: {
        "200": messageResponse("承認成功（全員承認済みなら削除も実行）"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound", "Conflict", "Gone"),
      },
    },
  },

  "/api/admin/delete-requests/{requestId}": {
    delete: {
      tags: [TAG],
      summary: "削除リクエストのキャンセル（owner のみ）",
      parameters: [pathParam("requestId", "削除リクエストID")],
      responses: {
        "200": messageResponse("キャンセル成功"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};

export const healthPaths: Paths = {
  "/health": {
    get: {
      tags: ["ヘルスチェック"],
      summary: "ヘルスチェック",
      description: "ALB のターゲットグループ監視用。",
      security: [],
      responses: {
        "200": jsonResponse("正常", {}),
      },
    },
  },
};
