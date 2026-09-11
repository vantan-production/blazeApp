// ニュース / メディア情報のエンドポイント定義
// 両者は news テーブルを type で分けた同一ロジックのため、パス定義もファクトリで共通化する

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

function createNewsTypePaths(basePath: string, tag: string, label: string): Paths {
  return {
    [basePath]: {
      get: {
        tags: [tag],
        summary: `${label}一覧`,
        description:
          "作成日時の降順・1ページ10件。未ログインの場合は visibility='public' のみを返す（Cookie があれば関係者限定の記事も含む）。",
        security: [],
        parameters: [pageParam],
        responses: {
          "200": listResponse("取得成功", "#/components/schemas/NewsPost"),
        },
      },
      post: {
        tags: [tag],
        summary: `${label}投稿（admin 以上）`,
        description:
          "画像は sharp で WebP（最大1920×1920）に変換して S3 に保存する。",
        requestBody: formBody({
          type: "object",
          required: ["title", "body"],
          properties: {
            title: fields.title,
            body: fields.body,
            category: fields.category,
            visibility: fields.visibility,
            image: fields.image,
          },
        }),
        responses: {
          "200": mutationResponse("投稿成功", "#/components/schemas/NewsPost"),
          ...errors("BadRequest", "Unauthorized", "Forbidden"),
        },
      },
    },

    [`${basePath}/categories`]: {
      get: {
        tags: [tag],
        summary: "カテゴリー候補（使用頻度の上位5件）",
        description: "投稿フォームのカテゴリー候補表示に使用する。",
        security: [],
        responses: {
          "200": jsonResponse("取得成功", {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/CategoryCount" },
            },
          }),
        },
      },
    },

    [`${basePath}/{id}`]: {
      get: {
        tags: [tag],
        summary: `${label}詳細`,
        description:
          "visibility='member' の記事は、未ログインからは存在を明かさないため 404 を返す。",
        security: [],
        parameters: [pathParam("id", `${label}のID`)],
        responses: {
          "200": itemResponse("取得成功", "#/components/schemas/NewsPost"),
          ...errors("BadRequest", "NotFound"),
        },
      },
      patch: {
        tags: [tag],
        summary: `${label}更新（admin 以上）`,
        description:
          "送信したフィールドのみ更新する。category に空文字を送るとカテゴリーを削除する。",
        parameters: [pathParam("id", `${label}のID`)],
        requestBody: formBody({
          type: "object",
          properties: {
            title: fields.title,
            body: fields.body,
            category: fields.category,
            visibility: fields.visibility,
            image: fields.image,
          },
        }),
        responses: {
          "200": mutationResponse("更新成功", "#/components/schemas/NewsPost"),
          ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
        },
      },
      delete: {
        tags: [tag],
        summary: `${label}削除（admin 以上）`,
        parameters: [pathParam("id", `${label}のID`)],
        responses: {
          "200": messageResponse("削除成功"),
          ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
        },
      },
    },
  };
}

export const newsPaths = createNewsTypePaths("/api/news-post", "ニュース", "ニュース");
export const mediaPaths = createNewsTypePaths("/api/media", "メディア情報", "メディア情報");
