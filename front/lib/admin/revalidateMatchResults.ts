"use server";

import { updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { MATCH_RESULTS_CACHE_TAG } from "@/lib/cacheTags";

/**
 * 公開ページ（/results）の「前回の試合結果」のキャッシュを捨てる。
 * 管理画面で試合結果を登録・更新・削除した直後に呼び、次の表示で最新の内容を読み直させる。
 * Server Action は誰でも呼べるため、admin 以上でログインしているときだけ捨てる
 */
export async function revalidateMatchResults(): Promise<void> {
	const user = await getCurrentUser();
	if (!user || user.role === "member") return;
	updateTag(MATCH_RESULTS_CACHE_TAG);
}
