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
        "未認証時は掲載同意済み（approved）の画像のみを、モザイク適用後の状態で返す。member 以上は全画像を原本（モザイクなし）で確認できる。",
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
    get: {
      tags: [TAG],
      summary: "モザイクの適用状態の取得（admin 以上）",
      description:
        "適用中の領域一覧と原本の URL を返す。編集画面で原本の上に現在の領域を並べて表示するために使う。",
      parameters: [pathParam("imageId", "画像ID")],
      responses: {
        "200": itemResponse("取得成功", "#/components/schemas/MosaicState"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
    post: {
      tags: [TAG],
      summary: "画像へのモザイク適用・再編集（admin 以上）",
      description:
        "送った領域一覧で原本からモザイク画像を作り直し、公開用の画像を差し替える（一覧は全置き換え。領域の追加・移動・削除・粗さ変更はすべてこの形で行う）。初回適用時に原本を originals/ 配下へ退避するため、何度やり直しても劣化せず、member 向けの原本閲覧も維持される。従来の単体指定（x, y, width, height）も受け付ける。",
      parameters: [pathParam("imageId", "画像ID")],
      requestBody: jsonBody({
        oneOf: [
          {
            type: "object",
            required: ["regions"],
            properties: {
              regions: {
                type: "array",
                minItems: 1,
                maxItems: 20,
                items: { $ref: "#/components/schemas/MosaicRegion" },
              },
            },
          },
          { $ref: "#/components/schemas/MosaicRegion" },
        ],
      }),
      responses: {
        "200": mutationResponse("適用成功", "#/components/schemas/MosaicState"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
    delete: {
      tags: [TAG],
      summary: "モザイクの解除（admin 以上）",
      description:
        "公開用の画像を原本に戻し、退避していた原本と領域一覧を削除する。モザイク未適用の画像は 400。",
      parameters: [pathParam("imageId", "画像ID")],
      responses: {
        "200": mutationResponse("解除成功", "#/components/schemas/MosaicState"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};
