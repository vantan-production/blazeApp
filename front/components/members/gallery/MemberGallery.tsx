"use client";

import { useCallback, useState } from "react";
import { toErrorMessage } from "@/lib/admin/api";
import { memberApi } from "@/lib/members/api";
import { openIssuedUrl } from "@/lib/members/download";
import { formatDate } from "@/lib/members/format";
import {
	type GalleryDownload,
	galleryConsentLabel,
	type MemberGalleryImage,
} from "@/lib/members/gallery";
import { useToastStore } from "@/lib/store/useToastStore";
import { MemberTag } from "../MemberTag";
import { PagedListStatus } from "../PagedListStatus";
import { usePagedList } from "../usePagedList";
import { WithdrawalRequestDialog } from "./WithdrawalRequestDialog";

const smallButtonClass =
	"flex h-8 w-full items-center justify-center rounded-full px-2 text-[12px] leading-[18px] tracking-[1px] shadow-[0px_2px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * 試合風景の原本（モザイクなし）の一覧（GET /api/members/gallery。10件ずつ追加読み込み）。
 * 「保存」で GET /api/members/gallery/:imageId/download の短時間URLを新しいタブで開き、
 * 「取り下げ依頼」で POST /api/consent-requests を送る
 */
export function MemberGallery() {
	const showToast = useToastStore((state) => state.showToast);
	const { items, loading, error, hasMore, loadMore } =
		usePagedList<MemberGalleryImage>(
			"/api/members/gallery",
			"写真の取得に失敗しました。",
		);
	const [downloadingId, setDownloadingId] = useState<string | null>(null);
	const [requestTarget, setRequestTarget] = useState<MemberGalleryImage | null>(
		null,
	);
	// この画面で依頼を送った写真（依頼済みかどうかを返す API は無いため、画面を開いている間だけ覚える）
	const [requestedIds, setRequestedIds] = useState<string[]>([]);

	const download = async (image: MemberGalleryImage) => {
		setDownloadingId(image.id);
		try {
			await openIssuedUrl(async () => {
				const res = await memberApi<GalleryDownload>(
					`/api/members/gallery/${image.id}/download`,
				);
				return res.data.url;
			});
		} catch (err) {
			showToast(toErrorMessage(err, "写真を開けませんでした。"), "error");
		} finally {
			setDownloadingId(null);
		}
	};

	const closeDialog = useCallback(() => setRequestTarget(null), []);

	const handleSent = (image: MemberGalleryImage) => {
		setRequestedIds((prev) => [...prev, image.id]);
		setRequestTarget(null);
		showToast("取り下げ依頼を送りました。");
	};

	return (
		<>
			<p className="w-full rounded-[10px] bg-brand-yellow px-4 py-3 text-[13px] leading-[21px] tracking-[0.5px] text-brand-black">
				ここにある写真はモザイク加工前の原本です。チーム関係者だけが見られます。
				SNSへの投稿や、チーム外の人への転送・共有はしないでください。
			</p>
			<PagedListStatus
				loading={loading}
				error={error}
				count={items.length}
				emptyMessage="写真はまだありません。"
				hasMore={hasMore}
				onLoadMore={loadMore}
			>
				<ul className="grid w-full grid-cols-2 gap-x-3 gap-y-6">
					{items.map((image) => {
						const requested = requestedIds.includes(image.id);
						return (
							<li key={image.id} className="flex min-w-0 flex-col gap-2">
								{/* biome-ignore lint/performance/noImgElement: S3の署名付きURLは毎回変わり、ホストもnext.configに登録していないためnext/imageを使わない */}
								<img
									src={image.url}
									alt={`${formatDate(image.created_at)}の試合写真`}
									loading="lazy"
									className="aspect-[4/3] w-full rounded-[8px] bg-white/20 object-cover"
								/>
								<div className="flex flex-wrap items-center gap-1">
									<time className="text-[12px] leading-[18px] tracking-[1px]">
										{formatDate(image.created_at)}
									</time>
									<MemberTag>
										{galleryConsentLabel[image.consent_status]}
									</MemberTag>
								</div>
								<button
									type="button"
									onClick={() => download(image)}
									disabled={downloadingId === image.id}
									className={`${smallButtonClass} bg-brand-white text-brand-blue`}
								>
									{downloadingId === image.id ? "準備中…" : "保存する"}
								</button>
								{/* すでに非掲載の写真は取り下げる必要がない */}
								{image.consent_status !== "rejected" && (
									<button
										type="button"
										onClick={() => setRequestTarget(image)}
										disabled={requested}
										className={`${smallButtonClass} bg-brand-blue text-brand-white ring-1 ring-white/60`}
									>
										{requested ? "依頼済み" : "掲載の取り下げを依頼"}
									</button>
								)}
							</li>
						);
					})}
				</ul>
			</PagedListStatus>
			{/* 対象ごとに作り直し、前に書きかけた理由が残らないようにする */}
			<WithdrawalRequestDialog
				key={requestTarget?.id ?? "closed"}
				image={requestTarget}
				onClose={closeDialog}
				onSent={handleSent}
			/>
		</>
	);
}
