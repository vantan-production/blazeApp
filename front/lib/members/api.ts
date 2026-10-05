// 関係者ページから back の API を呼ぶための補助。
// lib/apiClient.ts は 401 で公開サイトの /login へ飛ばし、back のエラー文言も捨ててしまうため、
// 関係者ページでは JSON のやり取りをこちらで行う（multipart は lib/admin/api.ts の sendFormData を使う）。

import type { ApiSuccess } from "../admin/api";
import { adminRoutes } from "../admin/routes";
import { API_BASE_URL, ApiError } from "../apiClient";

type Options = {
	method?: "GET" | "POST";
	/** クエリ文字列（page など） */
	params?: Record<string, string | number>;
	/** JSON で送るボディ */
	body?: unknown;
};

/** back のエラーボディ（{ success: false, errors }）から最初のメッセージを取り出す */
const pickErrorMessage = (body: unknown): string | null => {
	if (!body || typeof body !== "object") return null;
	const { errors } = body as {
		errors?: string | { field: string; message: string }[];
	};
	if (typeof errors === "string") return errors;
	if (Array.isArray(errors) && errors[0]) return errors[0].message;
	return null;
};

/**
 * 関係者向け API を呼ぶ。認証は HttpOnly Cookie（credentials: "include"）。
 * 失敗時は back の文言を載せた ApiError を投げる（画面では lib/admin/api.ts の toErrorMessage で文言にする）。
 * 未ログイン・セッション切れ（401）は管理画面と共通のログイン画面へ戻す。
 */
export const memberApi = async <T>(
	endpoint: string,
	{ method = "GET", params, body }: Options = {},
): Promise<ApiSuccess<T>> => {
	const url = new URL(`${API_BASE_URL}${endpoint}`);
	for (const [key, value] of Object.entries(params ?? {})) {
		url.searchParams.append(key, String(value));
	}

	const response = await fetch(url.toString(), {
		method,
		headers:
			body === undefined ? undefined : { "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
		credentials: "include",
		cache: "no-store",
	});

	const json: unknown = await response.json().catch(() => null);

	if (!response.ok) {
		if (response.status === 401 && typeof window !== "undefined") {
			window.location.href = adminRoutes.login;
		}
		throw new ApiError(
			pickErrorMessage(json) ?? `API Error: ${response.statusText}`,
			response.status,
		);
	}

	return json as ApiSuccess<T>;
};
