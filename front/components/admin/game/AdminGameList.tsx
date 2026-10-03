"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import { formatGameDate, type GamePost } from "@/lib/admin/game";
import { apiClient } from "@/lib/apiClient";
import { AdminGameListItem } from "./AdminGameListItem";

/** 投稿済み試合風景の一覧（GET /api/gameImg。10件ずつ追加読み込み） */
export function AdminGameList() {
	const [posts, setPosts] = useState<GamePost[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async (nextPage: number) => {
		setLoading(true);
		setError(null);
		try {
			const res = await apiClient<ApiSuccess<GamePost[]>>("/api/gameImg", {
				params: { page: nextPage },
			});
			setPosts((prev) => (nextPage === 1 ? res.data : [...prev, ...res.data]));
			setPage(nextPage);
			setTotalPages(res.pagination?.totalPages ?? 1);
		} catch {
			setError("試合風景の取得に失敗しました。");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load(1);
	}, [load]);

	if (error) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}

	if (!loading && posts.length === 0) {
		return (
			<p className="text-[14px] text-brand-white">
				まだ投稿された試合風景はありません。
			</p>
		);
	}

	return (
		<div className="flex w-full flex-col items-center gap-[30px]">
			<ul className="flex w-full flex-col gap-[30px]">
				{posts.map((post) => (
					<AdminGameListItem
						key={post.id}
						id={post.id}
						thumbnailUrl={post.img_url}
						imageCount={post.images.length}
						pendingCount={
							post.images.filter((image) => image.consent_status === "pending")
								.length
						}
						date={formatGameDate(post.created_at)}
					/>
				))}
			</ul>
			{loading && <p className="text-[14px] text-brand-white">読み込み中…</p>}
			{!loading && page < totalPages && (
				<button
					type="button"
					onClick={() => load(page + 1)}
					className="text-[14px] leading-[22px] tracking-[1px] text-brand-white underline"
				>
					もっと見る
				</button>
			)}
		</div>
	);
}
