// 試合風景のエンドポイント定義（/api/gameImg）

import {
  errors,
  fields,
  formBody,
  itemResponse,
  jsonBody,
  listResponse,
  messageResponse,
  mutationResponse,
  pageParam,
  pathParam,
  type Paths,
} from "../components.js";

const TAG = "試合風景";

export const gameImgPaths: Paths = {
  "/api/gameImg": {
    get: {
      tags: [TAG],
      summary: "試合風景一覧",
      description:
        "未認証時は掲載同意済み（approved）の画像のみを返す。admin 以上は全画像を確認できる。",
      security: [],
      parameters: [pageParam],
      responses: {
        "200": listResponse("取得成功", "#/components/schemas/GameImg"),
      },
    },
    post: {
      tags: [TAG],
      summary: "試合風景投稿（admin 以上）",
      description: "image を複数枚まとめて送信できる。初期の掲載同意ステータスは pending。",
      requestBody: formBody({
        type: "object",
        required: ["image"],
        properties: {
          image: {
            type: "array",
            items: fields.image,
            description: "画像ファイル（複数可）",
          },
        },
      }),
      responses: {
        "200": mutationResponse("投稿成功", "#/components/schemas/GameImg"),
        ...errors("BadRequest", "Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/gameImg/{id}": {
    get: {
      tags: [TAG],
      summary: "試合風景詳細",
      security: [],
      parameters: [pathParam("id", "試合風景ID")],
      responses: {
        "200": itemResponse("取得成功", "#/components/schemas/GameImg"),
        ...errors("BadRequest", "NotFound"),
      },
    },
    delete: {
      tags: [TAG],
      summary: "試合風景削除（admin 以上）",
      parameters: [pathParam("id", "試合風景ID")],
      responses: {
        "200": messageResponse("削除成功"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/gameImg/{id}/{imageId}": {
    patch: {
      tags: [TAG],
      summary: "試合風景の画像差し替え（admin 以上）",
      parameters: [
        pathParam("id", "試合風景ID"),
        pathParam("imageId", "差し替える画像のID"),
      ],
      requestBody: formBody({
        type: "object",
        required: ["image"],
        properties: { image: fields.image },
      }),
      responses: {
        "200": mutationResponse("差し替え成功", "#/components/schemas/StoredImage"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/gameImg/images/{imageId}/consent": {
    patch: {
      tags: [TAG],
      summary: "掲載同意ステータスの更新（admin 以上）",
      description:
        "pending（未確認・掲載保留）/ approved（同意済み・掲載可）/ rejected（拒否・掲載不可）。",
      parameters: [pathParam("imageId", "画像ID")],
      requestBody: jsonBody({
        type: "object",
        required: ["consent_status"],
        properties: {
          consent_status: {
            type: "string",
            enum: ["pending", "approved", "rejected"],
          },
        },
      }),
      responses: {
        "200": mutationResponse("更新成功", "#/components/schemas/StoredImage"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },

  "/api/gameImg/images/{imageId}/mosaic": {
    post: {
      tags: [TAG],
      summary: "画像へのモザイク適用（admin 以上）",
      description:
        "指定した矩形領域をピクセル化して S3 の画像を上書きする。座標は元画像のピクセル基準。",
      parameters: [pathParam("imageId", "画像ID")],
      requestBody: jsonBody({
        type: "object",
        required: ["x", "y", "width", "height"],
        properties: {
          x: { type: "integer", minimum: 0, description: "左上のX座標" },
          y: { type: "integer", minimum: 0, description: "左上のY座標" },
          width: { type: "integer", minimum: 1, description: "領域の幅" },
          height: { type: "integer", minimum: 1, description: "領域の高さ" },
        },
      }),
      responses: {
        "200": mutationResponse("適用成功", "#/components/schemas/StoredImage"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};
