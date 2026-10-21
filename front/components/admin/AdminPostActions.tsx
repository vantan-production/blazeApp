"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toErrorMessage } from "@/lib/admin/api";
import { apiClient } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";
import { AdminActionDialog } from "./AdminActionDialog";
import { AdminButtonLink } from "./AdminButton";

type Props = {
	/** 編集画面のパス */
	editHref: string;
	/** 削除するAPI（DELETE で呼ぶ） */
	deleteEndpoint: string;
	/** 削除後に戻る一覧のパス */
	listHref: string;
	/** 対象の呼び名（例: お知らせ・実績・メディア情報）。ボタンや確認文に使う */
	label: string;
	/** 確認ダイアログに小さく出す画像（どの投稿か確認させる） */
	imageUrl?: string | null;
};

/**
 * 投稿済みのお知らせ・実績・メディア情報の詳細の下に出す「編集する」と削除ボタン。
 * 削除は確認ダイアログを挟み、成功したら一覧へ戻る
 */
export function AdminPostActions({
	editHref,
	deleteEndpoint,
	listHref,
	label,
	imageUrl,
}: Props) {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await apiClient(deleteEndpoint, { method: "DELETE" });
			showToast(`${label}を削除しました。`);
			router.push(listHref);
		} catch (error) {
			showToast(toErrorMessage(error, "削除に失敗しました。"), "error");
			setDeleting(false);
			setDeleteOpen(false);
		}
	};

	const closeDelete = useCallback(() => setDeleteOpen(false), []);

	return (
		<>
			<AdminButtonLink href={editHref} variant="light" size="sm">
				編集する
			</AdminButtonLink>
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
					この{label}を削除
				</button>
			</div>
			<AdminActionDialog
				open={deleteOpen}
				tone="danger"
				title={`この${label}を削除しますか？`}
				description="公開ページからも消え、添付した画像やファイルも削除されます。この操作は取り消せません。"
				imageUrl={imageUrl}
				confirmLabel="削除する"
				onConfirm={handleDelete}
				onCancel={closeDelete}
				pending={deleting}
			/>
		</>
	);
}
