"use client";

import { useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import { formatNewsDate, type NewsPostDetail } from "@/lib/admin/news";
import { ApiError, apiClient } from "@/lib/apiClient";
import { NewsCategoryTag } from "./NewsCategoryTag";
import { NewsThumbnail } from "./NewsThumbnail";

type Props = {
	id: string;
};

/** 投稿済みニュースの詳細（GET /api/news-post/:id）。サムネイル・カテゴリー・日付・タイトル・本文・本文の画像を表示する */
export function AdminNewsDetail({ id }: Props) {
	const [post, setPost] = useState<NewsPostDetail | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<NewsPostDetail>>(`/api/news-post/${id}`)
			.then((res) => {
				if (!ignore) setPost(res.data);
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 404
						? "ニュースが見つかりません。"
						: "ニュースの取得に失敗しました。",
				);
			});
		return () => {
			ignore = true;
		};
	}, [id]);

	if (error) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}

	if (!post) {
		return <p className="text-[14px] text-brand-white">読み込み中…</p>;
	}

	return (
		<article className="flex w-full flex-col gap-4 text-brand-white">
			{post.img_url && (
				<NewsThumbnail
					url={post.img_url}
					className="aspect-[4/3] w-full rounded-[12px]"
				/>
			)}
			<div className="flex flex-col gap-2 after:h-px after:w-full">
				<div className="flex min-w-0 items-center gap-1">
					{post.category && <NewsCategoryTag>{post.category}</NewsCategoryTag>}
					<time className="shrink-0 px-[2px] text-[14px] leading-[22px] tracking-[1px]">
						{formatNewsDate(post.created_at)}
					</time>
				</div>
				<h2 className="pb-2 text-[20px] leading-[28px] font-medium tracking-[1px] break-all">
					{post.title}
				</h2>
			</div>
			<p className="text-[15px] leading-[26px] tracking-[1px] break-all whitespace-pre-wrap">
				{post.body}
			</p>
			{post.images.length > 0 && (
				// 投稿フォームの本文の画像（AdminBodyImages）と同じく横に並べ、はみ出した分は横スクロールにする。
				// 大きさは一覧のサムネイルと同じ 4:3 にそろえ、タップで元の画像を別タブで開く
				<ul className="-mx-[27px] flex snap-x snap-mandatory scroll-px-[27px] gap-3 overflow-x-auto px-[27px] pb-1">
					{post.images.map((image, index) => (
						<li key={image.id} className="shrink-0 snap-start">
							<a
								href={image.url}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={`本文の画像 ${index + 1}枚目を開く`}
								className="block transition-opacity hover:opacity-80"
							>
								<NewsThumbnail
									url={image.url}
									className="aspect-[4/3] w-[160px] rounded-[8px]"
								/>
							</a>
						</li>
					))}
				</ul>
			)}
		</article>
	);
}
