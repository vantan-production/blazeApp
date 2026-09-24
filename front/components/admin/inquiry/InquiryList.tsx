"use client";

import { useCallback, useEffect, useState } from "react";
import { type ApiSuccess, toErrorMessage } from "@/lib/admin/api";
import { apiClient } from "@/lib/apiClient";
import { InquiryListItem } from "./InquiryListItem";
import type { Inquiry } from "./types";

/** 問い合わせ一覧（GET /api/inquiry。新しい順に10件ずつ追加読み込み） */
export function InquiryList() {
	const [inquiries, setInquiries] = useState<Inquiry[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async (nextPage: number) => {
		setLoading(true);
		setError(null);
		try {
			const res = await apiClient<ApiSuccess<Inquiry[]>>("/api/inquiry", {
				params: { page: nextPage },
				// 当面はログインなしでも管理画面を表示するため、401 でも公開サイトの /login へ飛ばさない
				skipAuthRedirect: true,
			});
			setInquiries((prev) =>
				nextPage === 1 ? res.data : [...prev, ...res.data],
			);
			setPage(nextPage);
			setTotalPages(res.pagination?.totalPages ?? 1);
		} catch (err) {
			setError(toErrorMessage(err, "問い合わせの取得に失敗しました。"));
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

	if (!loading && inquiries.length === 0) {
		return (
			<p className="text-[14px] text-brand-white">
				問い合わせはまだありません。
			</p>
		);
	}

	return (
		<div className="flex w-full flex-col items-center gap-6">
			<ul className="flex w-full flex-col gap-3">
				{inquiries.map((inquiry) => (
					<InquiryListItem key={inquiry.id} inquiry={inquiry} />
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
