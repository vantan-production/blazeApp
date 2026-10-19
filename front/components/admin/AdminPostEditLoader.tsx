"use client";

import { useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import { ApiError, apiClient } from "@/lib/apiClient";

type Props<T> = {
	/** 今の内容を読み込むAPI（GET） */
	endpoint: string;
	/** 対象の呼び名（例: お知らせ）。エラー文に使う */
	label: string;
	/** 読み込めたらフォームを描く */
	children: (post: T) => React.ReactNode;
};

/** 投稿の編集画面。今の内容を読み込んでからフォームに入れる（お知らせ・実績・メディア情報で共通） */
export function AdminPostEditLoader<T>({
	endpoint,
	label,
	children,
}: Props<T>) {
	const [post, setPost] = useState<T | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<T>>(endpoint)
			.then((res) => {
				if (!ignore) setPost(res.data);
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 404
						? `${label}が見つかりません。削除された可能性があります。`
						: `${label}の取得に失敗しました。`,
				);
			});
		return () => {
			ignore = true;
		};
	}, [endpoint, label]);

	if (error) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}
	if (!post) {
		return <p className="text-[14px] text-brand-white">読み込み中…</p>;
	}
	return children(post);
}
