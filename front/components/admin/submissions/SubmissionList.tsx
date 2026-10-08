"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { type ApiSuccess, toErrorMessage } from "@/lib/admin/api";
import type { Submission, SubmissionDecision } from "@/lib/admin/submissions";
import { ApiError, apiClient } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";
import { SubmissionListItem } from "./SubmissionListItem";

// back の一覧は1ページ10件固定（back/src/utils/pagination.ts）
const PAGE_SIZE = 10;

type PendingAction = {
	submission: Submission;
	decision: SubmissionDecision;
};

/**
 * 関係者からの投稿申請の承認待ち一覧（GET /api/submissions/pending）。
 * 「承認して公開」で PATCH /api/submissions/:id/approve（ニュースとして公開）、
 * 「差し戻す」で PATCH /api/submissions/:id/reject（下書きに戻す）。10件ずつ追加読み込み
 */
export function SubmissionList() {
	const showToast = useToastStore((state) => state.showToast);
	const [submissions, setSubmissions] = useState<Submission[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [action, setAction] = useState<PendingAction | null>(null);
	const [handling, setHandling] = useState(false);

	// 1ページ目なら置き換え、2ページ目以降は重複を除いて後ろに足す。
	// setState は取得後のコールバックの中だけで行う（effect から同期的に呼ばない）
	const fetchPage = useCallback(
		(page: number, isCurrent: () => boolean = () => true) =>
			apiClient<ApiSuccess<Submission[]>>("/api/submissions/pending", {
				params: { page },
			})
				.then((res) => {
					if (!isCurrent()) return;
					setSubmissions((prev) => {
						if (page === 1) return res.data;
						const known = new Set(prev.map((s) => s.id));
						return [...prev, ...res.data.filter((s) => !known.has(s.id))];
					});
					setTotal(res.pagination?.total ?? res.data.length);
					setError(null);
				})
				.catch((err) => {
					if (!isCurrent()) return;
					setError(
						err instanceof ApiError && err.status === 403
							? "投稿申請を確認する権限がありません。"
							: "投稿申請の取得に失敗しました。",
					);
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

	// 承認・差し戻しで一覧から外した分だけ後ろの申請が前に詰まるため、
	// 読み込み済みの件数から次に取るページを決め、重なった分は fetchPage で除く
	const loadMore = () => {
		setLoading(true);
		fetchPage(Math.floor(submissions.length / PAGE_SIZE) + 1);
	};

	const removeFromList = (id: string) => {
		setSubmissions((prev) => prev.filter((s) => s.id !== id));
		setTotal((prev) => Math.max(prev - 1, 0));
	};

	const handle = async () => {
		if (!action) return;
		const { submission, decision } = action;
		setHandling(true);
		try {
			await apiClient(`/api/submissions/${submission.id}/${decision}`, {
				method: "PATCH",
			});
			showToast(
				decision === "approve"
					? "承認しました。ニュースとして公開されました。"
					: "差し戻しました。この投稿は公開されません。",
			);
			removeFromList(submission.id);
		} catch (err) {
			// 400: ほかの管理者が先に対応済み / 404: 申請が消えている。どちらも一覧から外す
			if (
				err instanceof ApiError &&
				(err.status === 400 || err.status === 404)
			) {
				showToast("この申請はすでに対応済みか、削除されています。", "error");
				removeFromList(submission.id);
			} else {
				showToast(
					toErrorMessage(
						err,
						decision === "approve"
							? "承認に失敗しました。"
							: "差し戻しに失敗しました。",
					),
					"error",
				);
			}
		} finally {
			setHandling(false);
			setAction(null);
		}
	};

	const closeAction = useCallback(() => setAction(null), []);

	const hasImage = Boolean(action?.submission.img_url);

	return (
		<div className="flex w-full flex-col items-center gap-[30px] text-brand-white">
			<p className="-mt-12 w-full text-[13px] leading-[20px] tracking-[1px] opacity-80">
				関係者から届いたニュース記事の申請です。承認するまで公開サイトには表示されません。
			</p>
			{!error && !loading && total > 0 && (
				<p className="-mt-4 self-start text-[14px] leading-[22px] tracking-[1px]">
					承認待ち {total}件
				</p>
			)}
			{error && <p className="text-[14px]">{error}</p>}
			{!error && !loading && submissions.length === 0 && (
				<p className="text-[14px]">承認待ちの投稿申請はありません。</p>
			)}
			<ul className="flex w-full flex-col gap-[30px]">
				{submissions.map((submission) => (
					<SubmissionListItem
						key={submission.id}
						submission={submission}
						onDecide={(decision) => setAction({ submission, decision })}
					/>
				))}
			</ul>
			{loading && <p className="text-[14px]">読み込み中…</p>}
			{!loading && !error && submissions.length < total && (
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
				imageUrl={action?.submission.img_url}
				{...(action?.decision === "approve"
					? {
							title: "承認して公開しますか？",
							description: `公開サイトの「ニュース」に、このタイトル・本文${hasImage ? "・画像" : ""}がそのまま掲載され、誰でも見られるようになります。承認後はこの画面から取り消せません。`,
							confirmLabel: "承認して公開",
						}
					: {
							title: "この申請を差し戻しますか？",
							description:
								"公開サイトには表示されないまま、承認待ちの一覧から外れます。申請した人へのお知らせは届かないため、理由は直接伝えてください。",
							confirmLabel: "差し戻す",
						})}
				onConfirm={handle}
				onCancel={closeAction}
				pending={handling}
			/>
		</div>
	);
}
