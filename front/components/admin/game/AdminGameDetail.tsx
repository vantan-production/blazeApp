"use client";

import { useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import {
	formatGameDate,
	type GamePost,
	gameConsentLabel,
} from "@/lib/admin/game";
import { ApiError, apiClient } from "@/lib/apiClient";
import { GameThumbnail } from "./GameThumbnail";

type Props = {
	id: string;
};

/**
 * 投稿済み試合風景の詳細（GET /api/gameImg/:id）。ニュース詳細と同じ並びで日付を出し、
 * 画像は 4:3 にそろえて2列で並べる。各画像の下に掲載同意の状態を出し、タップで元の画像を別タブで開く
 */
export function AdminGameDetail({ id }: Props) {
	const [post, setPost] = useState<GamePost | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<GamePost>>(`/api/gameImg/${id}`)
			.then((res) => {
				if (!ignore) setPost(res.data);
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 404
						? "試合風景が見つかりません。"
						: "試合風景の取得に失敗しました。",
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
			<div className="flex flex-col gap-2 after:h-px after:w-full after:bg-white">
				<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
					{formatGameDate(post.created_at)}
				</time>
				<h2 className="pb-2 text-[20px] leading-[28px] font-medium tracking-[1px]">
					画像 {post.images.length}枚
				</h2>
			</div>
			{/* TODO: 掲載同意の変更・モザイク処理（デザイン未作成。API は /api/gameImg/images/:imageId/consent・mosaic がある） */}
			<ul className="grid grid-cols-2 gap-3">
				{post.images.map((image, index) => (
					<li key={image.id} className="flex flex-col gap-1">
						<a
							href={image.url}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={`画像 ${index + 1}枚目を開く`}
							className="block transition-opacity hover:opacity-80"
						>
							<GameThumbnail
								url={image.url}
								className="aspect-[4/3] w-full rounded-[8px]"
							/>
						</a>
						{image.consent_status && (
							<span className="text-[12px] leading-[18px] tracking-[1px]">
								{gameConsentLabel[image.consent_status]}
							</span>
						)}
					</li>
				))}
			</ul>
		</article>
	);
}
