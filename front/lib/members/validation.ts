// 関係者ページの入力欄の制約。値は back の VALIDATION_LIMITS（limits.generated.json）をそのまま使う。
// lib/validation/limits.ts の型に未追加の項目なので、ここでは生成ファイルを直接読む。

import { z } from "zod";
import limits from "../validation/limits.generated.json";

const SURVEY_COMMENT_MAX = limits.surveyComment.max;
const CONSENT_REASON_MAX = limits.consentReason.max;

/** アンケートのコメント（任意）。back/src/survey/schemas.ts の respondSchema.comment と同じ */
export const surveyCommentSchema = z
	.string()
	.trim()
	.max(
		SURVEY_COMMENT_MAX,
		`コメントは${SURVEY_COMMENT_MAX}文字以内で入力してください。`,
	);

/** 掲載取り下げ依頼の理由（任意）。back の consentReasonSchema と同じ */
export const consentReasonSchema = z
	.string()
	.trim()
	.max(
		CONSENT_REASON_MAX,
		`理由は${CONSENT_REASON_MAX}文字以内で入力してください。`,
	);

export { CONSENT_REASON_MAX, SURVEY_COMMENT_MAX };
