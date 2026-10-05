// ユーザー管理・招待・アカウント削除依頼（owner 専用）の型と、画面表示用の小さな変換関数。
// API: back/src/admin/userManagement.ts, invitations.ts, deleteRequest.ts

import { API_BASE_URL, ApiError } from "../apiClient";
import type { ApiSuccess } from "./api";
import { adminRoutes } from "./routes";

/** 管理画面のロール（back/src/db/roleGuard.ts の Role と同じ） */
export type AdminRole = "owner" | "admin" | "member";

/** ロール変更で選べる順（権限の強い順） */
export const ADMIN_ROLES: AdminRole[] = ["owner", "admin", "member"];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
	owner: "オーナー",
	admin: "投稿担当",
	member: "関係者",
};

/** ロールの意味（運用担当者向けの短い説明） */
export const ADMIN_ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
	owner:
		"すべての操作ができます。ユーザーの招待・ロール変更・アカウント削除の承認もできます。",
	admin:
		"ニュース・実績・試合風景などの投稿や、問い合わせ・体験申込への対応ができます。",
	member: "関係者ページ（お知らせ・アンケートなど）を見ることができます。",
};

/** 招待で付与できるロール（back の invitationRoleSchema。owner は招待では発行できない） */
export type InvitationRole = Exclude<AdminRole, "owner">;

export const INVITATION_ROLES: InvitationRole[] = ["admin", "member"];

/** GET /api/admin/users の一件（削除済みは含まれない） */
export type AdminUser = {
	id: string;
	name: string;
	email: string;
	role: AdminRole;
	created_at: string;
};

/**
 * 招待の状態。back が used_at と expires_at から導出して返す。
 * 取り消した招待は DB から消えるため、一覧には出てこない（「取り消し済み」の状態は無い）
 */
export type InvitationStatus = "pending" | "used" | "expired";

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
	pending: "未使用",
	used: "登録済み",
	expired: "期限切れ",
};

/** GET /api/admin/invitations の一件（新しい順） */
export type Invitation = {
	id: string;
	email: string;
	role: InvitationRole;
	/** 発行した owner の id */
	invited_by: string;
	expires_at: string;
	used_at: string | null;
	created_at: string;
	status: InvitationStatus;
};

/** POST /api/admin/invitations の data（招待リンク・トークンは返らない。招待メールで本人に届く） */
export type InvitationCreated = {
	email: string;
	role: InvitationRole;
	expires_at: string;
};

/** GET /api/admin/delete-requests の一件（期限内のもののみ。承認状況は返らない） */
export type DeleteRequest = {
	id: string;
	target_user_id: string;
	requested_by: string;
	expires_at: string;
	created_at: string;
};

/** POST /api/admin/users/:userId/delete-request の data。他に owner がおらず即削除されたときは data が無い */
export type DeleteRequestCreated = {
	request_id: string;
	expires_at: string;
};

type ApiFieldError = { field: string; message: string };

/** back のエラーボディ（{ success: false, errors }）から最初のメッセージを取り出す */
const pickErrorMessage = (body: unknown): string | null => {
	if (!body || typeof body !== "object") return null;
	const { errors } = body as { errors?: string | ApiFieldError[] };
	if (typeof errors === "string") return errors;
	if (Array.isArray(errors) && errors[0]) return errors[0].message;
	return null;
};

/**
 * owner 専用 API を JSON で呼ぶ。
 * apiClient は失敗時に back の文言（「自分自身のロールは変更できません。」など）を捨てるため、
 * ここではエラーボディの文言を ApiError に載せて投げる（画面では toErrorMessage でそのまま出せる）
 */
export const requestAdminJson = async <T>(
	endpoint: string,
	method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
	payload?: unknown,
): Promise<ApiSuccess<T>> => {
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		method,
		headers:
			payload === undefined
				? undefined
				: { "Content-Type": "application/json" },
		body: payload === undefined ? undefined : JSON.stringify(payload),
		credentials: "include",
	});

	const body: unknown = await response.json().catch(() => null);

	if (!response.ok) {
		// 未ログイン・セッション切れは管理画面のログインへ戻す（lib/admin/api.ts の sendFormData と同じ）
		if (response.status === 401 && typeof window !== "undefined") {
			window.location.href = adminRoutes.login;
		}
		throw new ApiError(
			pickErrorMessage(body) ?? `API Error: ${response.statusText}`,
			response.status,
		);
	}

	return body as ApiSuccess<T>;
};

const jstDateTimeFormat = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
});

/** 日時（ISO）を日本時間の 2026/09/24 17:56 にする（端末のタイムゾーンに左右されないように固定） */
export const formatDateTime = (iso: string) => {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return jstDateTimeFormat.format(date);
};

/** ユーザー id → 名前の対応表（招待の発行者・削除依頼の対象者の表示用） */
export const toUserNameMap = (users: AdminUser[]) =>
	new Map(users.map((user) => [user.id, user.name]));
