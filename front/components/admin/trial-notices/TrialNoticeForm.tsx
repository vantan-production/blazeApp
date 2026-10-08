"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { AdminButton } from "@/components/admin/AdminButton";
import {
	AdminFieldError,
	AdminTextField,
} from "@/components/admin/AdminTextField";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
	ApiResponseError,
	type ApiSuccess,
	sendJson,
	toErrorMessage,
} from "@/lib/admin/api";
import { type FieldErrors, validateForm } from "@/lib/admin/form";
import { adminRoutes, adminTrialNoticeDetailPath } from "@/lib/admin/routes";
import { apiClient } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";
import { bodySchema, titleSchema } from "@/lib/validation/schemas";
import { CandidatePicker } from "./CandidatePicker";
import { type SendFailure, SendFailurePanel } from "./SendFailurePanel";
import {
	MAX_RECIPIENTS,
	pickSendResult,
	type TrialCandidate,
	type TrialNoticeSendResult,
} from "./types";

const noticeSchema = z.object({
	title: titleSchema,
	body: bodySchema,
});

type NoticeValues = z.input<typeof noticeSchema>;

/** 確認ダイアログで「はい」を押したときに送る内容（確認時点の入力で固定する） */
type SendTarget = {
	title: string;
	body: string;
	applicationIds: string[];
};

/**
 * 体験申込者への連絡メールの新規送信フォーム。
 * 宛先を選び、件名・本文を入力して POST /api/trial-notices に送る。
 * 一部または全員への送信に失敗した場合は画面に残り、失敗した方だけに再送できる
 */
export function TrialNoticeForm() {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);

	const [trialDate, setTrialDate] = useState("");
	const [candidates, setCandidates] = useState<TrialCandidate[]>([]);
	const [candidatesLoading, setCandidatesLoading] = useState(true);
	const [candidatesError, setCandidatesError] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const [values, setValues] = useState<NoticeValues>({ title: "", body: "" });
	const [errors, setErrors] = useState<FieldErrors<NoticeValues>>({});
	const [recipientError, setRecipientError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const [sendTarget, setSendTarget] = useState<SendTarget | null>(null);
	const [pending, setPending] = useState(false);
	const [failure, setFailure] = useState<SendFailure | null>(null);
	// 再送のたびに失敗パネルを作り直し、フォーカスし直すための番号
	const [failureKey, setFailureKey] = useState(0);
	// 一部だけ送れた回の送信履歴（届いた分だけ保存される）。全員送れたときの遷移先を決めるのに使う
	const [savedNoticeIds, setSavedNoticeIds] = useState<string[]>([]);

	useEffect(() => {
		// 絞り込みを素早く切り替えたとき、古い応答で一覧を上書きしないようにする
		let ignore = false;
		const load = async () => {
			setCandidatesLoading(true);
			setCandidatesError(null);
			try {
				const res = await apiClient<ApiSuccess<TrialCandidate[]>>(
					"/api/trial-notices/candidates",
					{
						params: trialDate ? { trial_date: trialDate } : undefined,
					},
				);
				if (!ignore) setCandidates(res.data);
			} catch (err) {
				if (!ignore) {
					setCandidates([]);
					setCandidatesError(
						toErrorMessage(err, "体験申込者の取得に失敗しました。"),
					);
				}
			} finally {
				if (!ignore) setCandidatesLoading(false);
			}
		};
		load();
		return () => {
			ignore = true;
		};
	}, [trialDate]);

	const toggleOne = (id: string) => {
		setRecipientError(null);
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleMany = (ids: string[], selected: boolean) => {
		setRecipientError(null);
		setSelectedIds((prev) => {
			const next = new Set(prev);
			for (const id of ids) {
				if (selected) next.add(id);
				else next.delete(id);
			}
			return next;
		});
	};

	// タイトル・本文・宛先がそろったらボタンを有効にし、押せる状態だと見て分かるようにする
	const canSubmit =
		noticeSchema.safeParse(values).success &&
		selectedIds.size > 0 &&
		selectedIds.size <= MAX_RECIPIENTS;

	/** 入力と宛先を確かめ、問題なければ確認ダイアログを開く */
	const openConfirm = (applicationIds: string[]) => {
		setSubmitError(null);

		const result = validateForm(noticeSchema, values);
		setErrors(result.success ? {} : result.errors);

		let nextRecipientError: string | null = null;
		if (applicationIds.length === 0) {
			nextRecipientError = "宛先を1名以上選んでください。";
		} else if (applicationIds.length > MAX_RECIPIENTS) {
			nextRecipientError = `一度に送信できるのは${MAX_RECIPIENTS}名までです（選択中: ${applicationIds.length}名）。`;
		}
		setRecipientError(nextRecipientError);

		if (!result.success || nextRecipientError) return;
		setSendTarget({
			title: result.data.title,
			body: result.data.body,
			applicationIds,
		});
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		openConfirm([...selectedIds]);
	};

	/** 選択を失敗した方だけに入れ替えて、確認のうえ送り直す */
	const handleRetry = () => {
		if (!failure) return;
		const failedIds = failure.failed.map((r) => r.application_id);
		setSelectedIds(new Set(failedIds));
		openConfirm(failedIds);
	};

	/** 送信結果（200）を画面に反映する。全員届いたら詳細へ、失敗があれば画面に残る */
	const applyResult = (result: TrialNoticeSendResult, message?: string) => {
		const noticeIds = result.notice
			? [...savedNoticeIds, result.notice.id]
			: savedNoticeIds;

		if (result.failed.length === 0) {
			showToast(`${result.sent.length}名に送信しました。`);
			// 途中で一部失敗→再送した場合は送信履歴が複数に分かれるので、一覧でまとめて見せる
			const latestId = noticeIds.at(-1);
			router.push(
				noticeIds.length === 1 && latestId
					? adminTrialNoticeDetailPath(latestId)
					: adminRoutes.trialNotices,
			);
			return;
		}

		setSavedNoticeIds(noticeIds);
		// 送れた方に二重送信しないよう、選択を失敗した方だけにしておく
		setSelectedIds(new Set(result.failed.map((r) => r.application_id)));
		setFailure({
			failed: result.failed,
			sentCount: result.sent.length,
			message: message ?? null,
		});
		setFailureKey((prev) => prev + 1);
	};

	const send = async () => {
		if (!sendTarget) return;
		const target = sendTarget;
		setSendTarget(null);
		setPending(true);
		setSubmitError(null);
		try {
			const res = await sendJson<TrialNoticeSendResult>("/api/trial-notices", {
				title: target.title,
				body: target.body,
				application_ids: target.applicationIds,
			});
			applyResult(res.data, res.message);
		} catch (err) {
			// 502（全員失敗）はボディに失敗した宛先が入っているので、再送できるように一覧で見せる
			const result =
				err instanceof ApiResponseError ? pickSendResult(err.body) : null;
			if (result && result.failed.length > 0) {
				setSelectedIds(new Set(result.failed.map((r) => r.application_id)));
				setFailure({
					failed: result.failed,
					sentCount: result.sent.length,
					message: toErrorMessage(err, "メールの送信に失敗しました。"),
				});
				setFailureKey((prev) => prev + 1);
			} else {
				setSubmitError(toErrorMessage(err, "メールの送信に失敗しました。"));
			}
		} finally {
			setPending(false);
		}
	};

	const closeConfirm = useCallback(() => setSendTarget(null), []);

	return (
		<>
			<form onSubmit={handleSubmit} noValidate className="w-full">
				{/* 送信中は数秒〜数十秒かかるため、入力とボタンをまとめて操作できなくする */}
				<fieldset
					disabled={pending}
					className="flex w-full flex-col items-center gap-9"
				>
					<div className="flex w-full flex-col gap-2">
						<CandidatePicker
							trialDate={trialDate}
							onTrialDateChange={setTrialDate}
							candidates={candidates}
							loading={candidatesLoading}
							error={candidatesError}
							selectedIds={selectedIds}
							onToggle={toggleOne}
							onToggleMany={toggleMany}
						/>
						{recipientError && (
							<AdminFieldError message={recipientError} tone="dark" />
						)}
					</div>

					<div className="flex w-full flex-col gap-5">
						<AdminTextField
							tone="dark"
							label="タイトル（メールの件名）"
							placeholder="件名を入力"
							value={values.title}
							onChange={(event) =>
								setValues((prev) => ({ ...prev, title: event.target.value }))
							}
							error={errors.title}
						/>
						<AdminTextField
							tone="dark"
							multiline
							label="本文"
							placeholder="本文を入力"
							value={values.body}
							onChange={(event) =>
								setValues((prev) => ({ ...prev, body: event.target.value }))
							}
							error={errors.body}
						/>
					</div>

					<div className="flex w-full flex-col items-center gap-2 px-5">
						{submitError && (
							<AdminFieldError message={submitError} tone="dark" />
						)}
						<AdminButton
							type="submit"
							variant="light"
							size="sm"
							disabled={pending || !canSubmit}
						>
							{pending ? "送信中…" : "送信"}
						</AdminButton>
						{pending && (
							<p
								role="status"
								className="text-center text-[12px] leading-[18px] tracking-[1px] text-brand-white"
							>
								メールを送信しています。人数によっては数十秒かかります。画面を閉じずにお待ちください。
							</p>
						)}
					</div>

					{failure && (
						<SendFailurePanel
							key={failureKey}
							failure={failure}
							savedNoticeIds={savedNoticeIds}
							onRetry={handleRetry}
							disabled={pending}
						/>
					)}
				</fieldset>
			</form>
			<ConfirmDialog
				open={sendTarget !== null}
				message={`${sendTarget?.applicationIds.length ?? 0}名に送信します。よろしいですか？`}
				onConfirm={send}
				onCancel={closeConfirm}
				pending={pending}
			/>
		</>
	);
}
