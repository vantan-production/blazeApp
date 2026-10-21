"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { type ApiSuccess, toErrorMessage } from "@/lib/admin/api";
import {
	type ConsentRequest,
	type ConsentRequestStatus,
	consentRequestStatusLabel,
	formatGameDate,
} from "@/lib/admin/game";
import { apiClient } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";
import { GameThumbnail } from "./GameThumbnail";

// 未対応だけ／すべて を切り替える
const filters = [
	{ value: "pending", label: "未対応" },
	{ value: "all", label: "すべて" },
] as const;

type Filter = (typeof filters)[number]["value"];

type PendingAction = {
	request: ConsentRequest;
	status: Exclude<ConsentRequestStatus, "pending">;
};

/**
 * 試合風景の掲載取り下げ依頼（GET/PATCH /api/consent-requests）。
 * 「取り下げる」にすると back が対象の画像を掲載しない（rejected）に変える。10件ずつ追加読み込み
 */
export function ConsentRequestList() {
	const showToast = useToastStore((state) => state.showToast);
	const [filter, setFilter] = useState<Filter>("pending");
	const [requests, setRequests] = useState<ConsentRequest[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [action, setAction] = useState<PendingAction | null>(null);
	const [handling, setHandling] = useState(false);

	// 表示中の絞り込みで nextPage を取り、1ページ目なら置き換え・2ページ目以降なら後ろに足す。
	// setState は取得後のコールバックの中だけで行う（effect から同期的に呼ばない）
	const fetchPage = useCallback(
		(nextPage: number, isCurrent: () => boolean = () => true) =>
			apiClient<ApiSuccess<ConsentRequest[]>>("/api/consent-requests", {
				params:
					filter === "all"
						? { page: nextPage }
						: { page: nextPage, status: filter },
			})
				.then((res) => {
					if (!isCurrent()) return;
					setRequests((prev) =>
						nextPage === 1 ? res.data : [...prev, ...res.data],
					);
					setPage(nextPage);
					setTotalPages(res.pagination?.totalPages ?? 1);
					setError(null);
				})
				.catch(() => {
					if (isCurrent()) setError("取り下げ依頼の取得に失敗しました。");
				})
				.finally(() => {
					if (isCurrent()) setLoading(false);
				}),
		[filter],
	);

	useEffect(() => {
		let current = true;
		fetchPage(1, () => current);
		return () => {
			current = false;
		};
	}, [fetchPage]);

	const changeFilter = (next: Filter) => {
		if (next === filter) return;
		setRequests([]);
		setLoading(true);
		setFilter(next);
	};

	const loadMore = () => {
		setLoading(true);
		fetchPage(page + 1);
	};

	const handle = async () => {
		if (!action) return;
		setHandling(true);
		try {
			await apiClient(`/api/consent-requests/${action.request.id}`, {
				method: "PATCH",
				body: JSON.stringify({ status: action.status }),
			});
			showToast(
				action.status === "accepted"
					? "画像の掲載を取り下げました。"
					: "取り下げを見送りました。",
			);
			// 未対応の絞り込み中なら一覧から外し、すべて表示中なら状態だけ変える
			setRequests((prev) =>
				filter === "pending"
					? prev.filter((r) => r.id !== action.request.id)
					: prev.map((r) =>
							r.id === action.request.id ? { ...r, status: action.status } : r,
						),
			);
		} catch (err) {
			showToast(
				toErrorMessage(err, "取り下げ依頼の対応に失敗しました。"),
				"error",
			);
		} finally {
			setHandling(false);
			setAction(null);
		}
	};

	const closeAction = useCallback(() => setAction(null), []);

	return (
		<div className="flex w-full flex-col items-center gap-[30px] text-brand-white">
			<div
				role="tablist"
				aria-label="表示する依頼"
				className="flex gap-2 self-start"
			>
				{filters.map((item) => (
					<button
						key={item.value}
						type="button"
						role="tab"
						aria-selected={filter === item.value}
						onClick={() => changeFilter(item.value)}
						className={`h-8 rounded-full px-4 text-[14px] leading-[22px] tracking-[1px] ring-1 ring-white/60 transition-opacity hover:opacity-80 ${filter === item.value ? "bg-brand-white text-brand-blue" : "bg-brand-blue text-brand-white"}`}
					>
						{item.label}
					</button>
				))}
			</div>
			{error && <p className="text-[14px]">{error}</p>}
			{!error && !loading && requests.length === 0 && (
				<p className="text-[14px]">
					{filter === "pending"
						? "未対応の取り下げ依頼はありません。"
						: "取り下げ依頼はまだありません。"}
				</p>
			)}
			<ul className="flex w-full flex-col gap-[30px]">
				{requests.map((request) => (
					<li
						key={request.id}
						className="flex flex-col gap-3 after:h-px after:w-full after:bg-white"
					>
						<div className="flex gap-3">
							{request.image_url ? (
								<a
									href={request.image_url}
									target="_blank"
									rel="noopener noreferrer"
									aria-label="対象の画像を開く"
									className="shrink-0 transition-opacity hover:opacity-80"
								>
									<GameThumbnail
										url={request.image_url}
										className="aspect-[4/3] w-[120px] rounded-[8px]"
									/>
								</a>
							) : (
								<GameThumbnail
									url={null}
									className="aspect-[4/3] w-[120px] shrink-0 rounded-[8px]"
								/>
							)}
							<div className="flex min-w-0 flex-1 flex-col gap-1">
								<div className="flex flex-wrap items-center gap-2">
									<time className="text-[14px] leading-[22px] tracking-[1px]">
										{formatGameDate(request.created_at)}
									</time>
									<span className="rounded-[200px] bg-white px-[10px] text-[12px] leading-[22px] tracking-[1px] text-brand-blue">
										{consentRequestStatusLabel[request.status]}
									</span>
								</div>
								<p className="text-[14px] leading-[22px] tracking-[1px] break-all">
									依頼者: {request.requester_name}
								</p>
								{request.handler_name && (
									<p className="text-[12px] leading-[18px] tracking-[1px] opacity-80">
										対応: {request.handler_name}
									</p>
								)}
							</div>
						</div>
						<p className="text-[14px] leading-[22px] tracking-[1px] whitespace-pre-wrap break-all">
							{request.reason || "（理由の記入なし）"}
						</p>
						{request.status === "pending" && (
							<div className="flex gap-2 pb-3">
								<button
									type="button"
									onClick={() => setAction({ request, status: "accepted" })}
									className="flex h-8 items-center rounded-full bg-brand-white px-4 text-[14px] leading-[22px] tracking-[1px] text-brand-blue shadow-[0px_2px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-80"
								>
									取り下げる
								</button>
								<button
									type="button"
									onClick={() => setAction({ request, status: "rejected" })}
									className="flex h-8 items-center rounded-full bg-brand-blue px-4 text-[14px] leading-[22px] tracking-[1px] text-brand-white shadow-[0px_2px_4px_rgba(0,0,0,0.25)] ring-1 ring-white/60 transition-opacity hover:opacity-80"
								>
									見送る
								</button>
							</div>
						)}
					</li>
				))}
			</ul>
			{loading && <p className="text-[14px]">読み込み中…</p>}
			{!loading && page < totalPages && (
				<button
					type="button"
					onClick={loadMore}
					className="text-[14px] leading-[22px] tracking-[1px] underline"
				>
					もっと見る
				</button>
			)}
			<AdminActionDialog
				open={action !== null}
				imageUrl={action?.request.image_url}
				{...(action?.status === "accepted"
					? {
							title: "この画像の掲載を取り下げますか？",
							description:
								"公開サイトからこの画像が見えなくなります。あとから詳細画面で「掲載する」に戻すこともできます。",
							confirmLabel: "取り下げる",
						}
					: {
							title: "取り下げを見送りますか？",
							description:
								"画像は掲載したままになり、この依頼は対応済みになります。",
							confirmLabel: "見送る",
						})}
				onConfirm={handle}
				onCancel={closeAction}
				pending={handling}
			/>
		</div>
	);
}
