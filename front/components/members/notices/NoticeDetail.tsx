"use client";

import { useEffect, useState } from "react";
import { toErrorMessage } from "@/lib/admin/api";
import { memberApi } from "@/lib/members/api";
import { formatDate } from "@/lib/members/format";
import type { NoticeDetail as NoticeDetailData } from "@/lib/members/notices";

type Props = {
	noticeId: string;
};

/**
 * 関係者限定お知らせの詳細（GET /api/notices/:id）。
 * 開いたら POST /api/notices/:id/read で既読にする（何度開いても初回の既読日時が残る）
 */
export function NoticeDetail({ noticeId }: Props) {
	const [notice, setNotice] = useState<NoticeDetailData | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let current = true;
		memberApi<NoticeDetailData>(`/api/notices/${noticeId}`)
			.then((res) => {
				if (!current) return;
				setNotice(res.data);
				setError(null);
				// 本文を表示できたときだけ既読にする。失敗しても読む邪魔はしない
				memberApi(`/api/notices/${noticeId}/read`, { method: "POST" }).catch(
					() => {},
				);
			})
			.catch((err: unknown) => {
				if (current) {
					setError(toErrorMessage(err, "お知らせの取得に失敗しました。"));
				}
			});
		return () => {
			current = false;
		};
	}, [noticeId]);

	if (error) {
		return (
			<p role="alert" className="text-[14px] text-brand-white">
				{error}
			</p>
		);
	}
	if (!notice) {
		return <p className="text-[14px] text-brand-white">読み込み中…</p>;
	}

	return (
		<article className="flex w-full flex-col gap-4 rounded-[20px] bg-brand-white px-5 py-6 text-brand-black">
			<header className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<time className="text-[14px] leading-[22px] tracking-[1px]">
						{formatDate(notice.created_at)}
					</time>
					{notice.category && (
						<span className="rounded-[200px] bg-brand-blue px-[10px] text-[12px] leading-[22px] tracking-[1px] text-white">
							{notice.category}
						</span>
					)}
				</div>
				<h2 className="text-[20px] leading-[28px] font-medium tracking-[1px] break-all">
					{notice.title}
				</h2>
				<p className="text-[12px] leading-[18px] tracking-[1px] text-brand-black/60">
					{notice.admin_name}
				</p>
			</header>
			{notice.img_url && (
				// biome-ignore lint/performance/noImgElement: S3の署名付きURLは期限付きで next/image の最適化対象にしない
				<img
					src={notice.img_url}
					alt=""
					className="w-full rounded-[10px] bg-black/10 object-cover"
				/>
			)}
			<p className="text-[15px] leading-[26px] tracking-[0.5px] whitespace-pre-wrap break-all">
				{notice.body}
			</p>
			{notice.images.length > 0 && (
				<ul className="flex flex-col gap-2">
					{notice.images.map((image) => (
						<li key={image.id}>
							{/* biome-ignore lint/performance/noImgElement: S3の署名付きURLは期限付きで next/image の最適化対象にしない */}
							<img
								src={image.url}
								alt=""
								className="w-full rounded-[10px] bg-black/10 object-cover"
							/>
						</li>
					))}
				</ul>
			)}
		</article>
	);
}
