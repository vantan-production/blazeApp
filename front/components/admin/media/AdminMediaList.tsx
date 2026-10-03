"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import { formatMediaDate, type MediaPost } from "@/lib/admin/media";
import { apiClient } from "@/lib/apiClient";
import { AdminMediaListItem } from "./AdminMediaListItem";

/** 投稿済みメディア情報の一覧（GET /api/media。10件ずつ追加読み込み） */
export function AdminMediaList() {
	const [posts, setPosts] = useState<MediaPost[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async (nextPage: number) => {
		setLoading(true);
		setError(null);
		try {
			const res = await apiClient<ApiSuccess<MediaPost[]>>("/api/media", {
				params: { page: nextPage },
			});
			setPosts((prev) => (nextPage === 1 ? res.data : [...prev, ...res.data]));
			setPage(nextPage);
			setTotalPages(res.pagination?.totalPages ?? 1);
		} catch {
			setError("メディア情報の取得に失敗しました。");
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
				まだ投稿されたメディア情報はありません。
			</p>
		);
	}

	return (
		<div className="flex w-full flex-col items-center gap-[30px]">
			<ul className="flex w-full flex-col gap-[30px]">
				{posts.map((post) => (
					<AdminMediaListItem
						key={post.id}
						id={post.id}
						thumbnailUrl={post.img_url}
						date={formatMediaDate(post.created_at)}
						title={post.title}
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
