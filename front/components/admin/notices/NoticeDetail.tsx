"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { AdminButtonLink } from "@/components/admin/AdminButton";
import { type ApiSuccess, toErrorMessage } from "@/lib/admin/api";
import {
	formatNoticeDate,
	formatNoticeDateTime,
	type Notice,
} from "@/lib/admin/notices";
import { adminNoticeEditPath, adminNoticeRoutes } from "@/lib/admin/routes";
import { ApiError, apiClient } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";
import { NoticeReadStatusSection } from "./NoticeReadStatusSection";
import { NoticeTags } from "./NoticeTags";

type Props = {
	id: string;
};

/**
 * 関係者向けお知らせの詳細（GET /api/notices/:id）。
 * 本文・画像の下に既読状況（GET /api/notices/:id/reads）を出し、編集画面へのリンクと削除（DELETE）を置く
 */
export function NoticeDetail({ id }: Props) {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const [notice, setNotice] = useState<Notice | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

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

	const deleteNotice = async () => {
		setDeleting(true);
		try {
			await apiClient(`/api/notices/${id}`, { method: "DELETE" });
			showToast("お知らせを削除しました。");
			router.push(adminNoticeRoutes.list);
		} catch (err) {
			showToast(toErrorMessage(err, "削除に失敗しました。"), "error");
			setDeleting(false);
			setDeleteOpen(false);
		}
	};

	const closeDelete = useCallback(() => setDeleteOpen(false), []);

	if (error) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}

	if (!notice) {
		return <p className="text-[14px] text-brand-white">読み込み中…</p>;
	}

	const edited = notice.updated_at !== notice.created_at;

	return (
		<article className="flex w-full flex-col gap-6 text-brand-white">
			<div className="flex flex-col gap-2 after:h-px after:w-full after:bg-white">
				<div className="flex flex-wrap items-center gap-2">
					<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
						{formatNoticeDate(notice.created_at)}
					</time>
					<NoticeTags notice={notice} />
				</div>
				<h2 className="text-[20px] leading-[28px] font-medium tracking-[1px] break-all">
					{notice.title}
				</h2>
				<p className="pb-2 text-[12px] leading-[18px] tracking-[1px] opacity-80">
					投稿: {notice.admin_name}
					{edited && `（${formatNoticeDateTime(notice.updated_at)} に更新）`}
				</p>
			</div>
			{notice.img_url && (
				// biome-ignore lint/performance/noImgElement: S3の署名付きURLは期限付きで next/image の最適化対象にしない
				<img
					src={notice.img_url}
					alt=""
					className="w-full rounded-[10px] bg-black/10 object-cover"
				/>
			)}
			<p className="text-[14px] leading-[24px] tracking-[1px] whitespace-pre-wrap break-all">
				{notice.body}
			</p>
			<AdminButtonLink
				href={adminNoticeEditPath(notice.id)}
				variant="light"
				size="sm"
			>
				編集する
			</AdminButtonLink>
			<NoticeReadStatusSection noticeId={notice.id} />
			<div className="mt-6 flex flex-col items-center gap-2 border-t border-white/30 pt-6">
				<button
					type="button"
					onClick={() => setDeleteOpen(true)}
					className="flex h-10 items-center gap-2 rounded-[10px] px-4 text-[15px] leading-[22px] tracking-[1px] text-[#ff8a8d] ring-1 ring-[#ff8a8d]/70 transition-opacity hover:opacity-80"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
						className="size-[18px]"
					>
						<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
					</svg>
					このお知らせを削除
				</button>
			</div>
			<AdminActionDialog
				open={deleteOpen}
				tone="danger"
				title="このお知らせを削除しますか？"
				description="関係者ページから見えなくなり、既読の記録も消えます。この操作は取り消せません。"
				imageUrl={notice.img_url}
				confirmLabel="削除する"
				onConfirm={deleteNotice}
				onCancel={closeDelete}
				pending={deleting}
			/>
		</article>
	);
}
