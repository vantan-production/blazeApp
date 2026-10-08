// 管理画面のアカウントまわり（パスワード再設定・ログアウト・通知設定・アカウント削除／復旧）の型と API 呼び出し。

import { API_BASE_URL, ApiError, apiClient } from "../apiClient";
import type { ApiSuccess } from "./api";
import { adminRoutes, homePathForRole } from "./routes";

/** ロールの表示名（back/src/db/roleGuard.ts の Role と同じ値） */
export const adminRoleLabel: Record<"owner" | "admin" | "member", string> = {
	owner: "オーナー",
	admin: "管理者",
	member: "関係者",
};

/** GET/PATCH /api/notification-settings の data（back/src/notification/index.ts） */
export type NotificationSettings = {
	/** 関係者向けのお知らせが投稿されたらメールで受け取る */
	notice_email: boolean;
	/** アンケートが投稿されたらメールで受け取る */
	survey_email: boolean;
};

export type NotificationSettingKey = keyof NotificationSettings;

/** 通知設定の各項目の見出しと説明（画面の並び順） */
export const notificationSettingItems: {
	key: NotificationSettingKey;
	label: string;
	description: string;
}[] = [
	{
		key: "notice_email",
		label: "お知らせのメール通知",
		description: "関係者向けのお知らせが投稿されたときにメールが届きます。",
	},
	{
		key: "survey_email",
		label: "アンケートのメール通知",
		description: "アンケートが投稿されたときにメールが届きます。",
	},
];

type ApiFieldError = { field: string; message: string };

/** back のエラーボディ（{ success: false, errors }）から最初のメッセージを取り出す */
const pickErrorMessage = (body: unknown): string | null => {
	if (!body || typeof body !== "object") return null;
	const { errors } = body as { errors?: string | ApiFieldError[] };
	if (typeof errors === "string") return errors;
	if (Array.isArray(errors) && errors[0]) return errors[0].message;
	return null;
};

type RequestOptions = {
	method?: "GET" | "POST" | "PATCH" | "DELETE";
	payload?: unknown;
	/**
	 * 401 のときに管理画面のログインへ移動するか（既定: する）。
	 * ログイン・アカウント削除のように「パスワード違い」も 401 で返る API では false にする。
	 */
	redirectOnUnauthorized?: boolean;
};

/**
 * アカウントまわりの JSON API を呼ぶ。
 * apiClient はエラー時のボディを捨てるうえ 401 で公開サイトの /login へ飛ぶため、ここでは
 * back の文言（「パスワードが正しくありません。」など）を ApiError の message に入れて投げ、
 * 401 は管理画面のログインへ戻す。toErrorMessage(error, fallback) でそのまま画面に出せる。
 */
export const accountRequest = async <T = undefined>(
	endpoint: string,
	{
		method = "GET",
		payload,
		redirectOnUnauthorized = true,
	}: RequestOptions = {},
): Promise<ApiSuccess<T>> => {
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		method,
		headers:
			payload === undefined
				? undefined
				: { "Content-Type": "application/json" },
		body: payload === undefined ? undefined : JSON.stringify(payload),
		// 認証は HttpOnly Cookie で行う
		credentials: "include",
	});

	const body: unknown = await response.json().catch(() => null);

	if (!response.ok) {
		if (
			response.status === 401 &&
			redirectOnUnauthorized &&
			typeof window !== "undefined"
		) {
			window.location.href = adminRoutes.login;
		}
		throw new ApiError(
			pickErrorMessage(body) ?? `API Error: ${response.statusText}`,
			response.status,
		);
	}

	return body as ApiSuccess<T>;
};

/**
 * ログイン直後に、ロールに合った行き先（homePathForRole）を調べる。
 * ログイン API はロールを返さないため /api/admin/me で確かめる。取れなければ管理画面TOPにする
 */
export const fetchHomePath = async (): Promise<string> => {
	try {
		const res = await apiClient<ApiSuccess<{ role: string }>>("/api/admin/me", {
			skipAuthRedirect: true,
		});
		return homePathForRole(res.data.role);
	} catch {
		return adminRoutes.top;
	}
};
