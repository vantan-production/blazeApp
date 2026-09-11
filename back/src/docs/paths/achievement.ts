// 実績のエンドポイント定義（/api/achievement）

import {
  errors,
  fields,
  formBody,
  itemResponse,
  listResponse,
  messageResponse,
  mutationResponse,
  pageParam,
  pathParam,
  type Paths,
} from "../components.js";

const TAG = "実績";

export const achievementPaths: Paths = {
  "/api/achievement": {
    get: {
      tags: [TAG],
      summary: "実績一覧",
      description: "作成日時の降順・1ページ10件。",
      security: [],
      parameters: [pageParam],
      responses: {
        "200": listResponse("取得成功", "#/components/schemas/Achievement"),
      },
    },
    post: {
      tags: [TAG],
      summary: "実績投稿（admin 以上）",
      description:
        "画像は WebP、動画は ffmpeg で MP4（H.264 / AAC）に変換して S3 に保存する。",
      requestBody: formBody({
        type: "object",
        required: ["title", "body"],
        properties: {
          title: fields.title,
          body: fields.body,
          image: fields.image,
          movie: fields.movie,
          file: fields.file,
        },
      }),
      responses: {
        "200": mutationResponse("投稿成功", "#/components/schemas/Achievement"),
        ...errors("BadRequest", "Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/achievement/{id}": {
    get: {
      tags: [TAG],
      summary: "実績詳細",
      security: [],
      parameters: [pathParam("id", "実績ID")],
      responses: {
        "200": itemResponse("取得成功", "#/components/schemas/Achievement"),
        ...errors("BadRequest", "NotFound"),
      },
    },
    patch: {
      tags: [TAG],
      summary: "実績更新（admin 以上）",
      description: "送信したフィールドのみ更新する。",
      parameters: [pathParam("id", "実績ID")],
      requestBody: formBody({
        type: "object",
        properties: {
          title: fields.title,
          body: fields.body,
          image: fields.image,
          movie: fields.movie,
          file: fields.file,
        },
      }),
      responses: {
        "200": mutationResponse("更新成功", "#/components/schemas/Achievement"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
    delete: {
      tags: [TAG],
      summary: "実績削除（admin 以上）",
      parameters: [pathParam("id", "実績ID")],
      responses: {
        "200": messageResponse("削除成功"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};
