// 体験申し込みのエンドポイント定義（/api/trial-application）

import {
  errors,
  fields,
  formBody,
  itemResponse,
  listResponse,
  mutationResponse,
  pageParam,
  pathParam,
  type Paths,
} from "../components.js";

const TAG = "体験申し込み";

export const trialPaths: Paths = {
  "/api/trial-application": {
    get: {
      tags: [TAG],
      summary: "体験申し込み一覧（admin 以上）",
      parameters: [pageParam],
      responses: {
        "200": listResponse("取得成功", "#/components/schemas/TrialApplication"),
        ...errors("Unauthorized", "Forbidden"),
      },
    },
    post: {
      tags: [TAG],
      summary: "体験申し込み（認証不要）",
      description:
        "申し込み者への確認メールと管理者への通知メールを送る。レートリミット: 1分に1回。",
      security: [],
      requestBody: formBody({
        type: "object",
        required: [
          "email",
          "trial_date",
          "name",
          "furigana",
          "gender",
          "birth_date",
          "school_name",
          "phone_number",
          "motivation",
        ],
        properties: {
          email: fields.email,
          trial_date: { type: "string", format: "date", description: "体験日（YYYY-MM-DD）" },
          name: { type: "string", maxLength: 50, description: "氏名" },
          furigana: { type: "string", maxLength: 100, description: "フリガナ" },
          gender: { type: "string", enum: ["male", "female", "other"] },
          birth_date: { type: "string", format: "date", description: "生年月日（YYYY-MM-DD）" },
          school_name: { type: "string", maxLength: 100, description: "学校名" },
          cram_school: { type: "string", maxLength: 100, description: "塾（任意）" },
          phone_number: { type: "string", maxLength: 20, description: "電話番号" },
          motivation: {
            type: "string",
            enum: ["flyer", "instagram", "referral", "other"],
            description: "体験のきっかけ",
          },
          motivation_other: {
            type: "string",
            maxLength: 200,
            description: "きっかけが other の場合は必須",
          },
          referrer_name: {
            type: "string",
            maxLength: 100,
            description: "きっかけが referral の場合の紹介者名（任意）",
          },
        },
      }),
      responses: {
        "200": mutationResponse("申し込み成功", "#/components/schemas/TrialApplication"),
        ...errors("BadRequest", "TooManyRequests"),
      },
    },
  },

  "/api/trial-application/{id}": {
    get: {
      tags: [TAG],
      summary: "体験申し込み詳細（admin 以上）",
      parameters: [pathParam("id", "申し込みID")],
      responses: {
        "200": itemResponse("取得成功", "#/components/schemas/TrialApplication"),
        ...errors("BadRequest", "Unauthorized", "Forbidden", "NotFound"),
      },
    },
  },
};
