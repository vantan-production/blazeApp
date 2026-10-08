// 管理画面から back の API を呼ぶための補助。
// JSON のやり取りは lib/apiClient.ts をそのまま使い、ここでは apiClient で扱えないものだけを足す。
//  - multipart/form-data の送信（apiClient は Content-Type: application/json を必ず付けるため使えない）
//  - エラー時もレスポンスボディを使いたい JSON 送信（apiClient は失敗時にボディを捨てて ApiError を投げるため）
//  - back のエラーレスポンス（{ success: false, errors }）から画面に出す文言を取り出す

import { API_BASE_URL, ApiError } from "../apiClient";

/** back の一覧APIが返すページネーション */
export type Pagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type ApiSuccess<T> = {
	success: true;
	message?: string;
	data: T;
	pagination?: Pagination;
};

type ApiFieldError = { field: string; message: string };

type ApiFailure = {
	success: false;
	errors?: string | ApiFieldError[];
};

/** back のエラーボディから最初のメッセージを取り出す */
const pickErrorMessage = (body: unknown): string | null => {
	if (!body || typeof body !== "object") return null;
	const { errors } = body as ApiFailure;
	if (typeof errors === "string") return errors;
	if (Array.isArray(errors) && errors[0]) return errors[0].message;
	return null;
};

/**
 * FormData を multipart/form-data で送る（画像・ファイル付きの投稿用）。
 * 認証は apiClient と同じく HttpOnly Cookie（credentials: "include"）で行う。
 */
export const sendFormData = async <T>(
	endpoint: string,
	formData: FormData,
	method: "POST" | "PATCH" = "POST",
): Promise<ApiSuccess<T>> => {
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		method,
		body: formData,
		credentials: "include",
	});

	const body: unknown = await response.json().catch(() => null);

	if (!response.ok) {
		// TODO: 確認のため当面はログインなしでも管理画面を表示するので、401 でもログイン画面へ飛ばさない。
		// 公開前に「401 なら window.location.href = adminRoutes.login」のリダイレクトを戻す
		throw new ApiError(
			pickErrorMessage(body) ?? `API Error: ${response.statusText}`,
			response.status,
		);
	}

	return body as ApiSuccess<T>;
};

/**
 * エラーレスポンスのボディを持つ ApiError。
 * 体験申込者への一斉送信（502 で失敗した宛先を返す）のように、失敗時のボディも画面で使う API 用。
 */
export class ApiResponseError extends ApiError {
	body: unknown;
	constructor(message: string, status: number, body: unknown) {
		super(message, status);
		this.name = "ApiResponseError";
		this.body = body;
	}
}

/**
 * JSON を送り、エラー時はボディ付きの ApiResponseError を投げる。
 * メール送信のように数十秒かかる処理もあるため、apiClient と違いタイムアウトは設けない。
 */
export const sendJson = async <T>(
	endpoint: string,
	payload: unknown,
	method: "POST" | "PATCH" = "POST",
): Promise<ApiSuccess<T>> => {
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
		credentials: "include",
	});

	const body: unknown = await response.json().catch(() => null);

	if (!response.ok) {
		// TODO: 確認のため当面はログインなしでも管理画面を表示するので、401 でもログイン画面へ飛ばさない。
		// 公開前に「401 なら window.location.href = adminRoutes.login」のリダイレクトを戻す
		throw new ApiResponseError(
			pickErrorMessage(body) ?? `API Error: ${response.statusText}`,
			response.status,
			body,
		);
	}

	return body as ApiSuccess<T>;
};

/**
 * 画面に表示するエラーメッセージを決める。
 * back 由来の文言があればそれを使い、無ければ fallback を返す。
 */
export const toErrorMessage = (error: unknown, fallback: string): string => {
	// 当面は未ログインでも管理画面を開けるため、401 はリダイレクトせずに文言で知らせる
	if (error instanceof ApiError && error.status === 401) {
		return "ログインが必要です。ログインしてからもう一度お試しください。";
	}
	if (error instanceof ApiError && !error.message.startsWith("API Error")) {
		return error.message;
	}
	return fallback;
};
