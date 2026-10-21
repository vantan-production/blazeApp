// 管理画面フォームのバリデーション補助。スキーマ自体は lib/validation/schemas.ts のものを組み合わせて使う。

import type { z } from "zod";

/** フィールド名 → 最初のエラーメッセージ */
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/**
 * zod で検証し、成功なら data、失敗ならフィールドごとの最初のエラーメッセージを返す。
 * 入力欄の下にそのまま表示する想定。
 */
export const validateForm = <S extends z.ZodType>(
	schema: S,
	values: unknown,
):
	| { success: true; data: z.infer<S> }
	| { success: false; errors: FieldErrors<z.input<S>> } => {
	const result = schema.safeParse(values);
	if (result.success) return { success: true, data: result.data };

	const errors: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const key = String(issue.path[0] ?? "");
		if (!(key in errors)) errors[key] = issue.message;
	}
	return { success: false, errors: errors as FieldErrors<z.input<S>> };
};
