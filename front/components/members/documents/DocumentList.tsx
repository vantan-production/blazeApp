"use client";

import { useState } from "react";
import { toErrorMessage } from "@/lib/admin/api";
import { memberApi } from "@/lib/members/api";
import type { DocumentDownload, MemberDocument } from "@/lib/members/documents";
import { openIssuedUrl } from "@/lib/members/download";
import { formatDate } from "@/lib/members/format";
import { useToastStore } from "@/lib/store/useToastStore";
import { MemberTag } from "../MemberTag";
import { PagedListStatus } from "../PagedListStatus";
import { usePagedList } from "../usePagedList";

/**
 * 関係者限定の資料の一覧（GET /api/documents。10件ずつ追加読み込み）。
 * 「開く」で GET /api/documents/:id/download の短時間URLを新しいタブで開く
 */
export function DocumentList() {
	const showToast = useToastStore((state) => state.showToast);
	const { items, loading, error, hasMore, loadMore } =
		usePagedList<MemberDocument>(
			"/api/documents",
			"資料の取得に失敗しました。",
		);
	const [openingId, setOpeningId] = useState<string | null>(null);

	const open = async (doc: MemberDocument) => {
		setOpeningId(doc.id);
		try {
			await openIssuedUrl(async () => {
				const res = await memberApi<DocumentDownload>(
					`/api/documents/${doc.id}/download`,
				);
				return res.data.url;
			});
		} catch (err) {
			showToast(toErrorMessage(err, "資料を開けませんでした。"), "error");
		} finally {
			setOpeningId(null);
		}
	};

	return (
		<PagedListStatus
			loading={loading}
			error={error}
			count={items.length}
			emptyMessage="資料はまだありません。"
			hasMore={hasMore}
			onLoadMore={loadMore}
		>
			<ul className="flex w-full flex-col gap-[30px]">
				{items.map((doc) => (
					<li
						key={doc.id}
						className="flex flex-col gap-2 after:mt-4 after:h-px after:w-full after:bg-white"
					>
						<div className="flex flex-wrap items-center gap-2">
							<time className="text-[14px] leading-[22px] tracking-[1px]">
								{formatDate(doc.updated_at)}
							</time>
							{doc.category && <MemberTag>{doc.category}</MemberTag>}
						</div>
						<p className="text-[18px] leading-[24px] tracking-[1px] break-all">
							{doc.title}
						</p>
						{doc.description && (
							<p className="text-[13px] leading-[21px] tracking-[0.5px] whitespace-pre-wrap break-all opacity-90">
								{doc.description}
							</p>
						)}
						<div className="flex items-center gap-3">
							<span className="min-w-0 flex-1 truncate text-[12px] leading-[18px] tracking-[0.5px] opacity-70">
								{doc.file_name ?? "ファイルがありません"}
							</span>
							<button
								type="button"
								onClick={() => open(doc)}
								disabled={!doc.has_file || openingId === doc.id}
								className="flex h-8 shrink-0 items-center rounded-full bg-brand-white px-4 text-[14px] leading-[22px] tracking-[1px] text-brand-blue shadow-[0px_2px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{openingId === doc.id ? "準備中…" : "開く"}
							</button>
						</div>
					</li>
				))}
			</ul>
		</PagedListStatus>
	);
}
