// 関係者エリア（原本ギャラリー）と掲載取り下げ依頼のエンドポイント定義

import {
  errors,
  jsonBody,
  jsonResponse,
  listResponse,
  pageParam,
  pathParam,
  str,
  type Paths,
} from "../components.js";
import { VALIDATION_LIMITS } from "../../db/schema.js";

const GALLERY_TAG = "関係者ギャラリー";
const CONSENT_TAG = "掲載取り下げ依頼";

export const memberGalleryPaths: Paths = {
  "/api/members/gallery": {
    get: {
      tags: [GALLERY_TAG],
      summary: "試合風景の原本一覧（member 以上）",
      description:
        "掲載同意ステータスを問わず全件を返し、画像URLはモザイク前の原本を指す。公開ギャラリー（/api/gameImg）が approved のみ・モザイク適用後なのと対になる。",
      parameters: [pageParam],
      responses: {
        "200": listResponse("取得成功", "#/components/schemas/MemberGalleryImage"),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/members/gallery/{imageId}/download": {
    get: {
      tags: [GALLERY_TAG],
      summary: "原本のダウンロードURL発行（member 以上）",
      description:
        "有効期限5分の署名付きURLを返す。一覧の閲覧用URLより短く、リンクが出回りにくいようにしている。",
      parameters: [pathParam("imageId", "画像ID")],
      responses: {
        "200": jsonResponse("URL発行", {
          data: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              url: { type: "string", description: "原本の署名付きURL" },
              is_original: {
                type: "boolean",
                description:
                  "退避済みの原本を指しているか（モザイク未適用の画像は false で、path がそのまま原本）",
              },
              expires_in: { type: "integer", description: "URLの有効秒数" },
            },
          },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};

export const consentRequestPaths: Paths = {
  "/api/consent-requests": {
    post: {
      tags: [CONSENT_TAG],
      summary: "取り下げを依頼する（member 以上）",
      description:
        "掲載をやめてほしい写真を指定して申し出る。誰が写っているかの紐付けは持たないため、任意の試合風景画像を対象にできる。",
      requestBody: jsonBody({
        type: "object",
        required: ["image_id"],
        properties: {
          image_id: { type: "string", format: "uuid", description: "対象の画像ID" },
          reason: str({ max: VALIDATION_LIMITS.consentReason.max }, "依頼理由（任意）"),
        },
      }),
      responses: {
        "200": jsonResponse("受付成功", {
          message: { type: "string" },
          data: { $ref: "#/components/schemas/ConsentRequest" },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
    get: {
      tags: [CONSENT_TAG],
      summary: "依頼一覧（admin 以上）",
      description: "?status= で pending / accepted / rejected に絞り込める。",
      parameters: [
        pageParam,
        {
          name: "status",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["pending", "accepted", "rejected"] },
          description: "対応ステータスで絞り込む",
        },
      ],
      responses: {
        "200": listResponse("取得成功", "#/components/schemas/ConsentRequestListItem"),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
  },

  "/api/consent-requests/{id}": {
    patch: {
      tags: [CONSENT_TAG],
      summary: "依頼に対応する（admin 以上）",
      description:
        "accepted にすると対象画像の掲載同意ステータスを rejected に更新し、公開ギャラリーから外す。対応済みの依頼は再度変更できない。",
      parameters: [pathParam("id", "依頼ID")],
      requestBody: jsonBody({
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["accepted", "rejected"],
            description: "accepted=取り下げる / rejected=取り下げない",
          },
        },
      }),
      responses: {
        "200": jsonResponse("対応完了", {
          message: { type: "string" },
          data: { $ref: "#/components/schemas/ConsentRequest" },
        }),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};
