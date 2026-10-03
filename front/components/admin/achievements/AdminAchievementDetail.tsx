"use client";

import { useEffect, useState } from "react";
import {
	type AchievementPost,
	formatAchievementDate,
} from "@/lib/admin/achievements";
import type { ApiSuccess } from "@/lib/admin/api";
import { ApiError, apiClient } from "@/lib/apiClient";
import { LinkifiedText } from "../LinkifiedText";
import { AchievementThumbnail } from "./AchievementThumbnail";

type Props = {
	id: string;
};

/**
 * 投稿済み実績の詳細（GET /api/achievement/:id）。ニュース詳細と同じく、画像・日付・タイトル・本文を表示し、
 * 添付した動画はその場で再生、ファイルは別タブで開けるようにする
 */
export function AdminAchievementDetail({ id }: Props) {
	const [post, setPost] = useState<AchievementPost | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<AchievementPost>>(`/api/achievement/${id}`)
			.then((res) => {
				if (!ignore) setPost(res.data);
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 404
						? "実績が見つかりません。"
						: "実績の取得に失敗しました。",
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
				<AchievementThumbnail
					url={post.img_url}
					className="aspect-[4/3] w-full rounded-[12px]"
				/>
			)}
			{post.movie_url && (
				// biome-ignore lint/a11y/useMediaCaption: 投稿された動画に字幕データは無い
				<video
					src={post.movie_url}
					controls
					playsInline
					preload="metadata"
					className="aspect-video w-full rounded-[12px] bg-black"
				/>
			)}
			<div className="flex flex-col gap-2 after:h-px after:w-full">
				<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
					{formatAchievementDate(post.created_at)}
				</time>
				<h2 className="pb-2 text-[20px] leading-[28px] font-medium tracking-[1px] break-all">
					{post.title}
				</h2>
			</div>
			<p className="text-[15px] leading-[26px] tracking-[1px] break-all whitespace-pre-wrap">
				<LinkifiedText text={post.body} />
			</p>
			{post.file_url && (
				<a
					href={post.file_url}
					target="_blank"
					rel="noopener noreferrer"
					className="flex h-12 items-center justify-center gap-2 rounded-[10px] border border-white text-[14px] tracking-[1px] transition-opacity hover:opacity-80"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
						className="size-5"
					>
						<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
						<path d="M14 3v6h6" />
					</svg>
					添付ファイルを開く
				</a>
			)}
		</article>
	);
}
