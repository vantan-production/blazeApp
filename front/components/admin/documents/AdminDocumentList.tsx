"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { type ApiSuccess, toErrorMessage } from "@/lib/admin/api";
import type {
	AdminDocument,
	DocumentDownload,
	SavedDocument,
} from "@/lib/admin/documents";
import { apiClient } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";
import { AdminDocumentListItem } from "./AdminDocumentListItem";

/**
 * 資料庫の一覧（GET /api/documents。10件ずつ追加読み込み）。
 * 資料ごとの詳細APIが無いため、ダウンロード（GET /api/documents/:id/download）・
 * 編集（PATCH /api/documents/:id）・削除（DELETE /api/documents/:id）は一覧の各行から行う
 */
export function AdminDocumentList() {
	const showToast = useToastStore((state) => state.showToast);
	const [documents, setDocuments] = useState<AdminDocument[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	// 編集フォームを開いている資料（同時に開くのは1件だけ）
	const [editingId, setEditingId] = useState<string | null>(null);
	const [downloadingId, setDownloadingId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<AdminDocument | null>(null);
	const [deleting, setDeleting] = useState(false);

	// nextPage を取り、1ページ目なら置き換え・2ページ目以降なら後ろに足す。
	// setState は取得後のコールバックの中だけで行う（effect から同期的に呼ばない）
	const fetchPage = useCallback(
		(nextPage: number, isCurrent: () => boolean = () => true) =>
			apiClient<ApiSuccess<AdminDocument[]>>("/api/documents", {
				params: { page: nextPage },
			})
				.then((res) => {
					if (!isCurrent()) return;
					setDocuments((prev) =>
						nextPage === 1 ? res.data : [...prev, ...res.data],
					);
					setPage(nextPage);
					setTotalPages(res.pagination?.totalPages ?? 1);
					setError(null);
				})
				.catch(() => {
					if (isCurrent()) setError("資料の取得に失敗しました。");
				})
				.finally(() => {
					if (isCurrent()) setLoading(false);
				}),
		[],
	);

	useEffect(() => {
		let current = true;
		fetchPage(1, () => current);
		return () => {
			current = false;
		};
	}, [fetchPage]);

	const loadMore = () => {
		setLoading(true);
		fetchPage(page + 1);
	};

	const download = async (document: AdminDocument) => {
		// URL を受け取ってから開くとスマホのブラウザがポップアップとして止めるため、先に新しいタブを開いておく
		const tab = window.open("", "_blank");
		setDownloadingId(document.id);
		try {
			const res = await apiClient<ApiSuccess<DocumentDownload>>(
				`/api/documents/${document.id}/download`,
			);
			if (tab) {
				tab.opener = null;
				tab.location.href = res.data.url;
			} else {
				window.location.assign(res.data.url);
			}
		} catch (err) {
			tab?.close();
			showToast(
				toErrorMessage(
					err,
					"ファイルを開けませんでした。もう一度お試しください。",
				),
				"error",
			);
		} finally {
			setDownloadingId(null);
		}
	};

	// 保存後は返ってきた内容で行を書き換える（登録者名などは一覧の値をそのまま使う）
	const handleSaved = (saved: SavedDocument, replacedFile: File | null) => {
		setDocuments((prev) =>
			prev.map((document) =>
				document.id === saved.id
					? {
							...document,
							...saved,
							...(replacedFile
								? { file_name: replacedFile.name, has_file: true }
								: {}),
						}
					: document,
			),
		);
		setEditingId(null);
		showToast("資料を更新しました。");
	};

	const deleteDocument = async () => {
		if (!deleteTarget) return;
		setDeleting(true);
		try {
			await apiClient(`/api/documents/${deleteTarget.id}`, {
				method: "DELETE",
			});
			setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
			showToast("資料を削除しました。");
		} catch (err) {
			showToast(toErrorMessage(err, "削除に失敗しました。"), "error");
		} finally {
			setDeleting(false);
			setDeleteTarget(null);
		}
	};

	const closeDelete = useCallback(() => setDeleteTarget(null), []);

	return (
		<div className="flex w-full flex-col items-center gap-[30px] text-brand-white">
			{error && <p className="text-[14px]">{error}</p>}
			{!error && !loading && documents.length === 0 && (
				<p className="text-center text-[14px] leading-[22px]">
					まだ資料はありません。
					<br />
					右下の＋から登録できます。
				</p>
			)}
			<ul className="flex w-full flex-col gap-[30px]">
				{documents.map((document) => (
					<AdminDocumentListItem
						key={document.id}
						document={document}
						editing={editingId === document.id}
						downloading={downloadingId === document.id}
						onDownload={() => download(document)}
						onEdit={() => setEditingId(document.id)}
						onCancelEdit={() => setEditingId(null)}
						onSaved={handleSaved}
						onDelete={() => setDeleteTarget(document)}
					/>
				))}
			</ul>
			{loading && <p className="text-[14px]">読み込み中…</p>}
			{!loading && !error && page < totalPages && (
				<button
					type="button"
					onClick={loadMore}
					className="text-[14px] leading-[22px] tracking-[1px] underline"
				>
					もっと見る
				</button>
			)}
			<AdminActionDialog
				open={deleteTarget !== null}
				tone="danger"
				title="この資料を削除しますか？"
				description={`「${deleteTarget?.title ?? ""}」とファイルが削除され、関係者ページからもダウンロードできなくなります。この操作は取り消せません。`}
				confirmLabel="削除する"
				onConfirm={deleteDocument}
				onCancel={closeDelete}
				pending={deleting}
			/>
		</div>
	);
}
