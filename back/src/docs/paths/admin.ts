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
      summary: "管理者登録（招待制）",
      description:
        "owner が発行した招待トークン経由でのみ登録できる。ロールは招待時に指定されたもの（admin / member）が付与される。email は招待された宛先と一致する必要がある。成功時は token が HttpOnly Cookie で発行される。レートリミット: 1分に1回。",
      security: [],
      requestBody: jsonBody({
        type: "object",
        required: ["token", "name", "email", "password", "passwordConfirmation"],
        properties: {
          token: fields.invitationToken,
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
              role: { type: "string", enum: ["admin", "member"] },
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

// 招待（owner専用。verify のみ認証不要）
export const invitationPaths: Paths = {
  "/api/admin/invitations": {
    post: {
      tags: [TAG],
      summary: "招待の発行（owner のみ）",
      description:
        "指定したメールアドレス宛に招待リンクを送信する。同じアドレス宛の未使用の招待は、この発行時に失効する。有効期限は7日。",
      requestBody: jsonBody({
        type: "object",
        required: ["email", "role"],
        properties: { email: fields.email, role: fields.invitationRole },
      }),
      responses: {
        "200": jsonResponse("発行成功（招待メールを送信）", {
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              role: fields.invitationRole,
              expires_at: { type: "string", format: "date-time" },
            },
          },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "Conflict"),
      },
    },
    get: {
      tags: [TAG],
      summary: "招待一覧（owner のみ）",
      description:
        "新しい順に返す。status は used_at / expires_at から導出した表示用の値。トークンハッシュは含まない。",
      responses: {
        "200": jsonResponse("取得成功", {
          total: { type: "integer" },
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                email: { type: "string", format: "email" },
                role: fields.invitationRole,
                invited_by: { type: "string", format: "uuid" },
                expires_at: { type: "string", format: "date-time" },
                used_at: { type: ["string", "null"], format: "date-time" },
                created_at: { type: "string", format: "date-time" },
                status: {
                  type: "string",
                  enum: ["pending", "used", "expired"],
                  description: "pending=未使用かつ期限内 / used=使用済み / expired=未使用で期限切れ",
                },
              },
            },
          },
        }),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/admin/invitations/verify": {
    get: {
      tags: [TAG],
      summary: "招待トークンの有効性確認",
      description:
        "登録画面がリンクの有効性を判定するために使う。認証不要。無効・期限切れ・使用済みはいずれも 400。",
      security: [],
      parameters: [
        {
          name: "token",
          in: "query",
          required: true,
          schema: fields.invitationToken,
          description: "招待トークン（生値）",
        },
      ],
      responses: {
        "200": jsonResponse("有効な招待", {
          data: {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              role: fields.invitationRole,
            },
          },
        }),
        ...errors("BadRequest"),
      },
    },
  },

  "/api/admin/invitations/{id}": {
    delete: {
      tags: [TAG],
      summary: "招待の失効（owner のみ）",
      description: "未使用の招待のみ失効できる。使用済みの招待は履歴として残すため削除できない。",
      parameters: [pathParam("id", "招待ID")],
      responses: {
        "200": messageResponse("失効成功"),
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
