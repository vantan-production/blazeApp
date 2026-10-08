// 公開ページのフォーム（お問い合わせ・体験申し込みなど）から back へ送信するための補助。
// back の公開フォーム用API は c.req.parseBody() で受け取るため JSON では届かない。
// apiClient は Content-Type: application/json を必ず付けるので、ここで FormData 用に別で用意する。
// 公開ページなので、401 でも apiClient のように /login へ飛ばさない。

import { API_BASE_URL, ApiError } from "./apiClient";

type ApiFieldError = { field: string; message: string };

export type PostFormSuccess<T> = {
	success: true;
	message?: string;
	data: T;
};

/** back のエラーボディから画面に出す最初のメッセージを取り出す */
const pickErrorMessage = (body: unknown): string | null => {
	if (!body || typeof body !== "object") return null;
	const { errors } = body as { errors?: string | ApiFieldError[] };
	if (typeof errors === "string") return errors;
	if (Array.isArray(errors) && errors[0]) return errors[0].message;
	return null;
};

/**
 * FormData を multipart/form-data で POST する。
 * 失敗時は back の文言（無ければ statusText）を持った ApiError を投げる。
 */
export const postForm = async <T>(
	endpoint: string,
	formData: FormData,
	timeout = 10000,
): Promise<PostFormSuccess<T>> => {
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(`${API_BASE_URL}${endpoint}`, {
			method: "POST",
			body: formData,
			credentials: "include",
			signal: controller.signal,
		});
		clearTimeout(id);

		// レートリミット(429)は JSON ではなくプレーンテキストで返ってくるため、先にテキストで読む
		const text = await response.text();
		let body: unknown = null;
		try {
			body = JSON.parse(text);
		} catch {
			body = null;
		}

		if (!response.ok) {
			const message =
				pickErrorMessage(body) ??
				(response.status === 429 && text ? text : null) ??
				`API Error: ${response.statusText}`;
			throw new ApiError(message, response.status);
		}

		return body as PostFormSuccess<T>;
	} catch (error) {
		clearTimeout(id);
		if (error instanceof DOMException && error.name === "AbortError") {
			throw new Error("Request timeout");
		}
		throw error;
	}
};

/**
 * 画面に表示するエラーメッセージを決める。
 * back 由来の文言があればそれを使い、無ければ fallback を返す。
 */
export const toErrorMessage = (error: unknown, fallback: string): string => {
	if (error instanceof ApiError && !error.message.startsWith("API Error")) {
		return error.message;
	}
	return fallback;
};
