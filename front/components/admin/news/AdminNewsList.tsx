"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import { formatNewsDate, type NewsPost } from "@/lib/admin/news";
import { apiClient } from "@/lib/apiClient";
import { AdminNewsListItem } from "./AdminNewsListItem";

/** 投稿済みニュースの一覧（GET /api/news-post。10件ずつ追加読み込み） */
export function AdminNewsList() {
	const [posts, setPosts] = useState<NewsPost[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async (nextPage: number) => {
		setLoading(true);
		setError(null);
		try {
			const res = await apiClient<ApiSuccess<NewsPost[]>>("/api/news-post", {
				params: { page: nextPage },
			});
			setPosts((prev) => (nextPage === 1 ? res.data : [...prev, ...res.data]));
			setPage(nextPage);
			setTotalPages(res.pagination?.totalPages ?? 1);
		} catch {
			setError("ニュースの取得に失敗しました。");
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
				まだ投稿されたニュースはありません。
			</p>
		);
	}

	return (
		<div className="flex w-full flex-col items-center gap-[30px]">
			<ul className="flex w-full flex-col gap-[30px]">
				{posts.map((post) => (
					<AdminNewsListItem
						key={post.id}
						id={post.id}
						thumbnailUrl={post.img_url}
						category={post.category}
						date={formatNewsDate(post.created_at)}
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
