"use client";

import { useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import { formatMediaDate, type MediaPost } from "@/lib/admin/media";
import { ApiError, apiClient } from "@/lib/apiClient";
import { LinkifiedText } from "../LinkifiedText";
import { MediaThumbnail } from "./MediaThumbnail";

type Props = {
	id: string;
};

/** 投稿済みメディア情報の詳細（GET /api/media/:id）。ニュース詳細と同じく、サムネイル・日付・タイトル・本文を表示する */
export function AdminMediaDetail({ id }: Props) {
	const [post, setPost] = useState<MediaPost | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<MediaPost>>(`/api/media/${id}`)
			.then((res) => {
				if (!ignore) setPost(res.data);
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 404
						? "メディア情報が見つかりません。"
						: "メディア情報の取得に失敗しました。",
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
				<MediaThumbnail
					url={post.img_url}
					className="aspect-[4/3] w-full rounded-[12px]"
				/>
			)}
			<div className="flex flex-col gap-2 after:h-px after:w-full">
				<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
					{formatMediaDate(post.created_at)}
				</time>
				<h2 className="pb-2 text-[20px] leading-[28px] font-medium tracking-[1px] break-all">
					{post.title}
				</h2>
			</div>
			<p className="text-[15px] leading-[26px] tracking-[1px] break-all whitespace-pre-wrap">
				<LinkifiedText text={post.body} />
			</p>
		</article>
	);
}
