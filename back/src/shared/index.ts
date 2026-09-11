// プロジェクト内部モジュールの集約

// DB接続
export { db } from "../db/index.js";

// Redis接続
export { redisClient } from "../db/redis.js";
export type { Role } from "../db/roleGuard.js";
// ロールガード
export {
	isMemberOrAbove,
	requireAdmin,
	requireMember,
	requireOwner,
} from "../db/roleGuard.js";
// S3ストレージ
export {
	deleteFromS3,
	downloadFromS3,
	generateS3Key,
	getPresignedDownloadUrl,
	uploadToS3,
} from "../db/s3.js";
// テーブル定義
// バリデーションスキーマ
export {
	achievement,
	admin,
	adminNameSchema,
	birthDateSchema,
	bodySchema,
	categorySchema,
	consentReasonSchema,
	consentRequestStatusSchema,
	consentRequests,
	consentStatusSchema,
	cramSchoolSchema,
	deletionApprovals,
	deletionRequests,
	documentDescriptionSchema,
	documents,
	documentTitleSchema,
	emailSchema,
	files,
	furiganaSchema,
	game,
	genderSchema,
	INQUIRY_STATUS_LABELS,
	images,
	inquiry,
	inquiryNameSchema,
	inquiryStatusSchema,
	invitationRoleSchema,
	invitations,
	invitationTokenSchema,
	motivationOtherSchema,
	motivationSchema,
	movies,
	news,
	newsReads,
	notificationSettings,
	passwordBaseSchema,
	passwordResetTokens,
	phoneNumberSchema,
	postStatusSchema,
	referrerNameSchema,
	reply,
	schoolNameSchema,
	surveyOptionLabelSchema,
	surveyOptions,
	surveyResponses,
	surveys,
	surveyTitleSchema,
	titleSchema,
	trialApplication,
	trialDateSchema,
	trialNameSchema,
	VALIDATION_LIMITS,
	visibilitySchema,
} from "../db/schema.js";
// 認証ミドルウェア
export { authToken, getOptionalUser } from "../db/token.js";
// 汎用CRUDルーター
export { createCrudRouter } from "../utils/crudRouter.js";
// メール送信
export {
	sendInquiryAutoReplyEmail,
	sendInvitationEmail,
	sendNoticeNotificationEmail,
	sendPasswordResetEmail,
	sendSurveyNotificationEmail,
	sendTrialApplicationAdminNotification,
	sendTrialApplicationConfirmationEmail,
} from "../utils/mail.js";
// メディア処理ユーティリティ
export {
	compressImage,
	compressUploadedImage,
	compressVideo,
	extractRawPreview,
	isRawImageExtension,
	isValidImageExtension,
	isValidVideoExtension,
	sanitizeHtml,
	validateFileExtension,
	validateFileSize,
	validateImageFileSize,
	validateMultipleFiles,
	validateRawFileSize,
} from "../utils/media.js";
// 汎用メディア処理ヘルパー
export {
	deleteMediaFromS3,
	getRelatedMediaUrls,
	processFileUpload,
	processImageUpload,
	processVideoUpload,
	replaceMediaOnS3,
	toMediaUrl,
} from "../utils/mediaHandler.js";
// ページネーション
export { buildPagination, parsePage } from "../utils/pagination.js";
