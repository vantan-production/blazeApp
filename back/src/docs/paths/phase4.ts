// 資料庫・投稿申請・通知設定のエンドポイント定義（ロール設計 Phase 4）

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
  str,
  type Paths,
} from "../components.js";
import { VALIDATION_LIMITS } from "../../db/schema.js";

const DOCUMENT_TAG = "資料庫";
const SUBMISSION_TAG = "投稿申請";
const NOTIFICATION_TAG = "通知設定";

const documentFields = {
  title: str(VALIDATION_LIMITS.documentTitle, "資料のタイトル"),
  description: str(
    { max: VALIDATION_LIMITS.documentDescription.max },
    "資料の説明（任意）",
  ),
  category: fields.category,
  file: { type: "string", format: "binary", description: "配布するファイル（PDF等）" },
};

export const documentPaths: Paths = {
  "/api/documents": {
    get: {
      tags: [DOCUMENT_TAG],
      summary: "資料一覧（member 以上）",
      description:
        "規約・年間スケジュール・練習メニュー等の配布物。一覧ではファイル名だけを返し、実URLは download で都度発行する。",
      parameters: [pageParam],
      responses: {
        "200": listResponse("取得成功", "#/components/schemas/Document"),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
    post: {
      tags: [DOCUMENT_TAG],
      summary: "資料の登録（admin 以上）",
      description: "ファイルは必須。保存に失敗した場合は資料ごと作成を取り消す。",
      requestBody: formBody({
        type: "object",
        required: ["title", "file"],
        properties: documentFields,
      }),
      responses: {
        "200": mutationResponse("登録成功", "#/components/schemas/Document"),
        ...errors("BadRequest", "Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/documents/{id}": {
    patch: {
      tags: [DOCUMENT_TAG],
      summary: "資料の更新（admin 以上）",
      description:
        "送信したフィールドのみ更新する。file を送るとS3上のファイルを差し替える。category に空文字を送ると分類を削除する。",
      parameters: [pathParam("id", "資料ID")],
      requestBody: formBody({ type: "object", properties: documentFields }),
      responses: {
        "200": mutationResponse("更新成功", "#/components/schemas/Document"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
    delete: {
      tags: [DOCUMENT_TAG],
      summary: "資料の削除（admin 以上）",
      description: "紐づくファイルもS3から削除する。",
      parameters: [pathParam("id", "資料ID")],
      responses: {
        "200": messageResponse("削除成功"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/documents/{id}/download": {
    get: {
      tags: [DOCUMENT_TAG],
      summary: "資料のダウンロードURL発行（member 以上）",
      description: "有効期限5分の署名付きURLを返す。",
      parameters: [pathParam("id", "資料ID")],
      responses: {
        "200": jsonResponse("URL発行", {
          data: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              url: { type: "string" },
              file_name: { type: ["string", "null"] },
              expires_in: { type: "integer", description: "URLの有効秒数" },
            },
          },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};

export const submissionPaths: Paths = {
  "/api/submissions": {
    get: {
      tags: [SUBMISSION_TAG],
      summary: "自分の申請一覧（member 以上）",
      description:
        "自分が作成した記事を状態を問わず返す（下書き・承認待ち・公開済み）。",
      parameters: [pageParam],
      responses: {
        "200": listResponse("取得成功", "#/components/schemas/NewsPost"),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
    post: {
      tags: [SUBMISSION_TAG],
      summary: "投稿を申請する（member 以上）",
      description:
        "status='pending' の記事として作られ、承認されるまで公開APIには現れない。",
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
        "200": mutationResponse("申請成功", "#/components/schemas/NewsPost"),
        ...errors("BadRequest", "Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/submissions/pending": {
    get: {
      tags: [SUBMISSION_TAG],
      summary: "承認待ち一覧（admin 以上）",
      parameters: [pageParam],
      responses: {
        "200": listResponse("取得成功", "#/components/schemas/NewsPost"),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/submissions/{id}/approve": {
    patch: {
      tags: [SUBMISSION_TAG],
      summary: "申請を承認して公開（admin 以上）",
      description: "status を published にする。承認待ち以外の記事には使えない。",
      parameters: [pathParam("id", "申請（記事）のID")],
      responses: {
        "200": mutationResponse("承認成功", "#/components/schemas/NewsPost"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/submissions/{id}/reject": {
    patch: {
      tags: [SUBMISSION_TAG],
      summary: "申請を差し戻す（admin 以上）",
      description: "status を draft に戻す。承認待ち以外の記事には使えない。",
      parameters: [pathParam("id", "申請（記事）のID")],
      responses: {
        "200": mutationResponse("差し戻し成功", "#/components/schemas/NewsPost"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};

export const notificationPaths: Paths = {
  "/api/notification-settings": {
    get: {
      tags: [NOTIFICATION_TAG],
      summary: "自分の通知設定（member 以上）",
      description: "設定を一度も変更していないユーザーは既定値（どちらも true）を返す。",
      responses: {
        "200": jsonResponse("取得成功", {
          data: { $ref: "#/components/schemas/NotificationSettings" },
        }),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
    patch: {
      tags: [NOTIFICATION_TAG],
      summary: "通知設定の変更（member 以上）",
      description: "送信した項目のみ変更する。少なくとも1つは指定すること。",
      requestBody: jsonBody({
        type: "object",
        properties: {
          notice_email: {
            type: "boolean",
            description: "新しい関係者限定お知らせをメールで受け取る",
          },
          survey_email: {
            type: "boolean",
            description: "新しいアンケートをメールで受け取る",
          },
        },
      }),
      responses: {
        "200": jsonResponse("更新成功", {
          message: { type: "string" },
          data: { $ref: "#/components/schemas/NotificationSettings" },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden"),
      },
    },
  },
};
