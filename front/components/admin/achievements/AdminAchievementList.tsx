"use client";

import { useCallback, useEffect, useState } from "react";
import {
	type AchievementPost,
	formatAchievementDate,
} from "@/lib/admin/achievements";
import type { ApiSuccess } from "@/lib/admin/api";
import { apiClient } from "@/lib/apiClient";
import { AdminAchievementListItem } from "./AdminAchievementListItem";

/** 投稿済み実績の一覧（GET /api/achievement。10件ずつ追加読み込み） */
export function AdminAchievementList() {
	const [posts, setPosts] = useState<AchievementPost[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// setState は取得後だけで行う（effect から同期的に呼ばない: react-hooks/set-state-in-effect）
	const fetchPage = useCallback(
		(nextPage: number) =>
			apiClient<ApiSuccess<AchievementPost[]>>("/api/achievement", {
				params: { page: nextPage },
			})
				.then((res) => {
					setPosts((prev) =>
						nextPage === 1 ? res.data : [...prev, ...res.data],
					);
					setPage(nextPage);
					setTotalPages(res.pagination?.totalPages ?? 1);
					setError(null);
				})
				.catch(() => {
					setError("実績の取得に失敗しました。");
				})
				.finally(() => setLoading(false)),
		[],
	);

	useEffect(() => {
		fetchPage(1);
	}, [fetchPage]);

	const loadMore = () => {
		setLoading(true);
		fetchPage(page + 1);
	};

	if (error) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}

	if (!loading && posts.length === 0) {
		return (
			<p className="text-[14px] text-brand-white">
				まだ投稿された実績はありません。
			</p>
		);
	}

	return (
		<div className="flex w-full flex-col items-center gap-[30px]">
			<ul className="flex w-full flex-col gap-[30px]">
				{posts.map((post) => (
					<AdminAchievementListItem
						key={post.id}
						id={post.id}
						thumbnailUrl={post.img_url}
						hasMovie={post.movie_url !== null}
						hasFile={post.file_url !== null}
						date={formatAchievementDate(post.created_at)}
						title={post.title}
					/>
				))}
			</ul>
			{loading && <p className="text-[14px] text-brand-white">読み込み中…</p>}
			{!loading && page < totalPages && (
				<button
					type="button"
					onClick={loadMore}
					className="text-[14px] leading-[22px] tracking-[1px] text-brand-white underline"
				>
					もっと見る
				</button>
			)}
		</div>
	);
}
