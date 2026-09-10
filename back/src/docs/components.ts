// OpenAPI ドキュメントの共通部品（型・ヘルパー・components セクション）
//
// ルート定義そのものからスキーマを自動生成できないため（各ハンドラが parseBody / req.json を
// 直接読んでいるため）、ここでは OpenAPI を手書きする。ただし文字数などの制約値は
// db/schema.ts の VALIDATION_LIMITS を import して参照し、二重管理にならないようにする。

import { VALIDATION_LIMITS } from "../db/schema.js";

export type JsonSchema = Record<string, unknown>;
export type Operation = Record<string, unknown>;
export type PathItem = Record<string, Operation>;
export type Paths = Record<string, PathItem>;

// ヘルパー

// 文字列フィールド（VALIDATION_LIMITS の min / max をそのまま反映する）
export const str = (
  limit: { min?: number; max: number },
  description: string,
): JsonSchema => ({
  type: "string",
  ...(limit.min === undefined ? {} : { minLength: limit.min }),
  maxLength: limit.max,
  description,
});

export const uuidField = (description: string): JsonSchema => ({
  type: "string",
  format: "uuid",
  description,
});

export const dateTimeField = (description: string): JsonSchema => ({
  type: "string",
  format: "date-time",
  description,
});

// application/json のリクエストボディ
export const jsonBody = (schema: JsonSchema): JsonSchema => ({
  required: true,
  content: { "application/json": { schema } },
});

// multipart/form-data のリクエストボディ（画像・動画・ファイルを含む投稿系）
export const formBody = (schema: JsonSchema): JsonSchema => ({
  required: true,
  content: { "multipart/form-data": { schema } },
});

// 200 レスポンス（{ success: true, ... } の形）
export const jsonResponse = (
  description: string,
  properties: Record<string, JsonSchema>,
): JsonSchema => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: { success: { type: "boolean", const: true }, ...properties },
      },
    },
  },
});

// 一覧レスポンス（data 配列 + pagination）
export const listResponse = (description: string, itemRef: string): JsonSchema =>
  jsonResponse(description, {
    data: { type: "array", items: { $ref: itemRef } },
    pagination: { $ref: "#/components/schemas/Pagination" },
  });

// 単体レスポンス（data オブジェクト）
export const itemResponse = (description: string, itemRef: string): JsonSchema =>
  jsonResponse(description, { data: { $ref: itemRef } });

// 作成・更新系のレスポンス（message + data）
export const mutationResponse = (description: string, itemRef: string): JsonSchema =>
  jsonResponse(description, {
    message: { type: "string" },
    data: { $ref: itemRef },
  });

// メッセージのみのレスポンス
export const messageResponse = (description: string): JsonSchema =>
  jsonResponse(description, { message: { type: "string" } });

// エラーレスポンス（components.responses への参照）
export const errors = (...names: string[]): Record<string, JsonSchema> =>
  Object.fromEntries(
    names.map((name) => [
      ERROR_STATUS[name] ?? "400",
      { $ref: `#/components/responses/${name}` },
    ]),
  );

const ERROR_STATUS: Record<string, string> = {
  BadRequest: "400",
  Unauthorized: "401",
  Forbidden: "403",
  NotFound: "404",
  Conflict: "409",
  Gone: "410",
  TooManyRequests: "429",
};

// パラメータ

export const pageParam: JsonSchema = {
  name: "page",
  in: "query",
  required: false,
  schema: { type: "integer", minimum: 1, default: 1 },
  description: "ページ番号（1ページ10件固定）",
};

export const pathParam = (name: string, description: string): JsonSchema => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
  description,
});

// components セクション

const errorResponse = (description: string): JsonSchema => ({
  description,
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
  },
});

export const components: JsonSchema = {
  securitySchemes: {
    // ログイン / 登録時に Set-Cookie される HttpOnly Cookie。
    // ブラウザが自動で送るため、Scalar 上では明示的な入力は不要。
    cookieAuth: {
      type: "apiKey",
      in: "cookie",
      name: "token",
      description:
        "POST /api/admin/login の成功時に発行される HttpOnly Cookie。ブラウザから叩く場合は自動で送信される。",
    },
  },

  responses: {
    BadRequest: errorResponse("リクエスト不正・バリデーションエラー"),
    Unauthorized: errorResponse("未認証（トークンなし・無効・期限切れ）"),
    Forbidden: errorResponse("権限不足（admin / owner 限定のエンドポイント）"),
    NotFound: errorResponse("対象が存在しない"),
    Conflict: errorResponse("重複（メールアドレス・承認済みなど）"),
    Gone: errorResponse("有効期限切れ"),
    TooManyRequests: errorResponse("レートリミット超過"),
  },

  schemas: {
    ErrorResponse: {
      type: "object",
      properties: {
        success: { type: "boolean", const: false },
        errors: {
          description:
            "文字列（単一メッセージ）か、Zod のバリデーション結果を整形した配列のいずれか。",
          oneOf: [
            { type: "string" },
            {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          ],
        },
      },
    },

    Pagination: {
      type: "object",
      description: "1ページ10件固定のページネーション情報",
      properties: {
        page: { type: "integer" },
        limit: { type: "integer", const: 10 },
        total: { type: "integer" },
        totalPages: { type: "integer" },
      },
    },

    AdminUser: {
      type: "object",
      properties: {
        id: uuidField("ユーザーID"),
        name: { type: "string" },
        email: { type: "string", format: "email" },
        role: { type: "string", enum: ["owner", "admin", "member"] },
        created_at: dateTimeField("作成日時"),
      },
    },

    Survey: {
      type: "object",
      description: "アンケート／出欠確認",
      properties: {
        id: uuidField("アンケートID"),
        title: { type: "string" },
        body: { type: ["string", "null"], description: "説明文" },
        closes_at: {
          type: ["string", "null"],
          format: "date-time",
          description: "回答締切（null なら締切なし）",
        },
        allow_multiple: { type: "boolean", description: "複数選択を許可するか" },
        admin_id: { type: ["string", "null"], format: "uuid" },
        created_at: dateTimeField("作成日時"),
        updated_at: dateTimeField("更新日時"),
      },
    },

    SurveySummary: {
      allOf: [
        { $ref: "#/components/schemas/Survey" },
        {
          type: "object",
          properties: {
            admin_name: { type: "string", description: "作成者名" },
            is_closed: { type: "boolean", description: "締切を過ぎているか" },
            has_responded: { type: "boolean", description: "自分が回答済みか" },
          },
        },
      ],
    },

    SurveyOption: {
      type: "object",
      description: "アンケートの選択肢",
      properties: {
        id: uuidField("選択肢ID"),
        survey_id: uuidField("アンケートID"),
        label: { type: "string" },
        sort_order: { type: "integer", description: "表示順" },
        created_at: dateTimeField("作成日時"),
      },
    },

    SurveyDetail: {
      allOf: [
        { $ref: "#/components/schemas/Survey" },
        {
          type: "object",
          properties: {
            admin_name: { type: "string" },
            is_closed: { type: "boolean" },
            options: {
              type: "array",
              items: { $ref: "#/components/schemas/SurveyOption" },
            },
            my_response: {
              type: "object",
              description: "自分の回答（未回答なら option_ids が空）",
              properties: {
                option_ids: {
                  type: "array",
                  items: { type: "string", format: "uuid" },
                },
                comment: { type: ["string", "null"] },
              },
            },
          },
        },
      ],
    },

    SurveyParticipant: {
      type: "object",
      description: "アンケートの対象ユーザー",
      properties: {
        id: uuidField("ユーザーID"),
        name: { type: "string" },
        email: { type: "string", format: "email" },
        role: { type: "string", enum: ["owner", "admin", "member"] },
      },
    },

    SurveyResults: {
      type: "object",
      description: "アンケートの集計結果",
      properties: {
        respondent_count: {
          type: "integer",
          description: "回答した実人数（複数選択でも1人は1と数える）",
        },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              option_id: uuidField("選択肢ID"),
              label: { type: "string" },
              sort_order: { type: "integer" },
              count: { type: "integer", description: "票数" },
              voters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: uuidField("ユーザーID"),
                    name: { type: "string" },
                    email: { type: ["string", "null"], format: "email" },
                  },
                },
              },
            },
          },
        },
        comments: {
          type: "array",
          description: "自由記述（1人1件にまとめたもの）",
          items: {
            type: "object",
            properties: {
              user_id: uuidField("ユーザーID"),
              name: { type: "string" },
              comment: { type: "string" },
            },
          },
        },
      },
    },

    Notice: {
      allOf: [
        { $ref: "#/components/schemas/NewsPost" },
        {
          type: "object",
          description: "関係者限定お知らせ（一覧では自分の既読状態が付く）",
          properties: {
            is_read: { type: "boolean", description: "自分が既読かどうか" },
            read_at: {
              type: ["string", "null"],
              format: "date-time",
              description: "自分が既読にした日時（未読なら null）",
            },
          },
        },
      ],
    },

    NoticeReader: {
      type: "object",
      description: "既読状況に並ぶユーザー（未読側には read_at が無い）",
      properties: {
        id: uuidField("ユーザーID"),
        name: { type: "string" },
        email: { type: "string", format: "email" },
        role: { type: "string", enum: ["owner", "admin", "member"] },
        read_at: { type: "string", format: "date-time" },
      },
    },

    NewsPost: {
      type: "object",
      description:
        "ニュース / メディア情報 / 関係者限定お知らせ（news テーブル。type で分類）",
      properties: {
        id: uuidField("投稿ID"),
        title: { type: "string" },
        body: { type: "string" },
        img: { type: ["string", "null"], description: "画像のS3キー" },
        img_url: {
          type: ["string", "null"],
          description: "画像の署名付きURL（S3キーから都度生成）",
        },
        type: { type: "string", enum: ["news", "media", "notice"] },
        visibility: {
          type: "string",
          enum: ["public", "member"],
          description:
            "公開範囲。member は関係者限定で、未ログインの一覧・詳細には現れない（type='notice' は常に member）",
        },
        category: { type: ["string", "null"] },
        admin_id: { type: ["string", "null"], format: "uuid" },
        admin_name: {
          type: "string",
          description: "投稿者名（アカウント削除済みの場合は「元管理者」）",
        },
        images: {
          type: "array",
          description: "紐づく画像（詳細取得時のみ）",
          items: { $ref: "#/components/schemas/StoredImage" },
        },
        created_at: dateTimeField("作成日時"),
        updated_at: dateTimeField("更新日時"),
      },
    },

    CategoryCount: {
      type: "object",
      description: "使用頻度の高いカテゴリー（上位5件）",
      properties: {
        category: { type: "string" },
        count: { type: "integer" },
      },
    },

    Inquiry: {
      type: "object",
      properties: {
        id: uuidField("問い合わせID"),
        name: { type: "string" },
        email: { type: ["string", "null"], format: "email" },
        title: { type: "string" },
        body: { type: "string" },
        img: { type: ["string", "null"] },
        img_url: { type: ["string", "null"], description: "画像の署名付きURL" },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "resolved"],
          description: "対応ステータス（未対応 / 対応中 / 対応済み）",
        },
        created_at: dateTimeField("受信日時"),
      },
    },

    Reply: {
      type: "object",
      description: "問い合わせへの返信",
      properties: {
        id: uuidField("返信ID"),
        inquiry_id: uuidField("問い合わせID"),
        admin_id: { type: ["string", "null"], format: "uuid" },
        title: { type: "string" },
        body: { type: "string" },
        img: { type: ["string", "null"] },
        img_url: { type: ["string", "null"], description: "画像の署名付きURL" },
        file: { type: ["string", "null"] },
        file_url: { type: ["string", "null"], description: "ファイルの署名付きURL" },
        admin_name: {
          type: "string",
          description: "返信した管理者名（アカウント削除済みの場合は「元管理者」）",
        },
        created_at: dateTimeField("返信日時"),
      },
    },

    TrialApplication: {
      type: "object",
      properties: {
        id: uuidField("申し込みID"),
        email: { type: "string", format: "email" },
        trial_date: { type: "string", format: "date" },
        name: { type: "string" },
        furigana: { type: "string" },
        gender: { type: "string", enum: ["male", "female", "other"] },
        birth_date: { type: "string", format: "date" },
        school_name: { type: "string" },
        cram_school: { type: ["string", "null"] },
        phone_number: { type: "string" },
        motivation: {
          type: "string",
          enum: ["flyer", "instagram", "referral", "other"],
        },
        motivation_other: { type: ["string", "null"] },
        referrer_name: { type: ["string", "null"] },
        created_at: dateTimeField("申し込み日時"),
      },
    },

    Achievement: {
      type: "object",
      properties: {
        id: uuidField("実績ID"),
        title: { type: "string" },
        body: { type: "string" },
        img: { type: ["string", "null"] },
        img_url: { type: ["string", "null"] },
        movie: { type: ["string", "null"] },
        movie_url: { type: ["string", "null"] },
        file: { type: ["string", "null"] },
        file_url: { type: ["string", "null"] },
        admin_id: { type: ["string", "null"], format: "uuid" },
        admin_name: { type: "string" },
        created_at: dateTimeField("作成日時"),
        updated_at: dateTimeField("更新日時"),
      },
    },

    StoredImage: {
      type: "object",
      description: "images テーブルの1件（試合風景は掲載同意ステータスを持つ）",
      properties: {
        id: uuidField("画像ID"),
        path: { type: "string", description: "S3キー" },
        url: { type: ["string", "null"], description: "署名付きURL" },
        consent_status: {
          type: "string",
          enum: ["pending", "approved", "rejected"],
          description: "掲載同意ステータス（未確認 / 同意済み / 拒否）",
        },
        game_id: { type: ["string", "null"], format: "uuid" },
        created_at: dateTimeField("登録日時"),
      },
    },

    GameImg: {
      type: "object",
      description: "試合風景（1投稿に複数画像）",
      properties: {
        id: uuidField("試合風景ID"),
        img: { type: ["string", "null"] },
        img_url: {
          type: ["string", "null"],
          description:
            "代表画像の署名付きURL（未認証時は掲載同意済みの画像のみが対象）",
        },
        images: { type: "array", items: { $ref: "#/components/schemas/StoredImage" } },
        admin_id: { type: ["string", "null"], format: "uuid" },
        admin_name: { type: "string" },
        created_at: dateTimeField("投稿日時"),
      },
    },

    DeletionRequest: {
      type: "object",
      description: "他者アカウント削除リクエスト（owner全員の承認で実行、24時間で失効）",
      properties: {
        id: uuidField("リクエストID"),
        target_user_id: uuidField("削除対象ユーザーID"),
        requested_by: uuidField("リクエストしたownerのID"),
        expires_at: dateTimeField("失効日時"),
        created_at: dateTimeField("作成日時"),
      },
    },
  },
};

// 投稿系で共通して使うフィールド定義（VALIDATION_LIMITS 由来）
export const fields = {
  title: str(VALIDATION_LIMITS.title, "タイトル"),
  body: str(VALIDATION_LIMITS.body, "本文"),
  category: str(VALIDATION_LIMITS.category, "カテゴリー（自由入力・任意）"),
  email: str(VALIDATION_LIMITS.email, "メールアドレス（半角のみ・@は1つ）"),
  password: str(
    VALIDATION_LIMITS.password,
    "パスワード（半角英数字記号。登録時は zxcvbn スコア3以上が必要）",
  ),
  adminName: str(VALIDATION_LIMITS.adminName, "管理者名"),
  visibility: {
    type: "string",
    enum: ["public", "member"],
    description: "公開範囲（既定は public。member は関係者限定）",
  },
  invitationToken: {
    type: "string",
    pattern: "^[0-9a-f]{64}$",
    description: "招待トークン（招待メールのリンクに含まれる64桁のhex）",
  },
  invitationRole: {
    type: "string",
    enum: ["admin", "member"],
    description: "招待時に付与するロール（owner は招待では発行できない）",
  },
  inquiryName: str(VALIDATION_LIMITS.inquiryName, "問い合わせ者の名前"),
  image: { type: "string", format: "binary", description: "画像ファイル（任意）" },
  movie: { type: "string", format: "binary", description: "動画ファイル（任意）" },
  file: { type: "string", format: "binary", description: "添付ファイル（任意）" },
} satisfies Record<string, JsonSchema>;
