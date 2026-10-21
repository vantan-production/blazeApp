"use client";

import { useEffect, useState } from "react";
import type { ApiSuccess } from "@/lib/admin/api";
import type { Notice } from "@/lib/admin/notices";
import { ApiError, apiClient } from "@/lib/apiClient";
import { NoticeForm } from "./NoticeForm";

type Props = {
	id: string;
};

/** お知らせの編集画面。今の内容を GET /api/notices/:id で読み込んでからフォームに入れる */
export function NoticeEdit({ id }: Props) {
	const [notice, setNotice] = useState<Notice | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<Notice>>(`/api/notices/${id}`)
			.then((res) => {
				if (!ignore) setNotice(res.data);
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 404
						? "お知らせが見つかりません。削除された可能性があります。"
						: "お知らせの取得に失敗しました。",
				);
			});
		return () => {
			ignore = true;
		};
	}, [id]);

	if (error) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}

	if (!notice) {
		return <p className="text-[14px] text-brand-white">読み込み中…</p>;
	}

	return <NoticeForm notice={notice} />;
}
