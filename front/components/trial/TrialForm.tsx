"use client";

import { useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { upcomingPracticeDates } from "@/components/features/activities/practiceDates";
import { primaryButtonClass } from "@/components/ui/buttonStyles";
import {
	FormField,
	fieldClass,
	PRIVACY_CONSENT_ERROR,
	PrivacyConsent,
} from "@/components/ui/form";
import { postForm, toErrorMessage } from "@/lib/postForm";
import {
	birthDateSchema,
	cramSchoolSchema,
	emailSchema,
	furiganaSchema,
	GENDER_LABELS,
	genderSchema,
	MOTIVATION_LABELS,
	motivationOtherSchema,
	motivationSchema,
	phoneNumberSchema,
	referrerNameSchema,
	schoolNameSchema,
	trialDateSchema,
	trialNameSchema,
} from "@/lib/validation/schemas";

// back/src/trial/create.ts と同じ項目・同じ制約（キー名も back に合わせてそのまま送る）
const trialFormSchema = z
	.object({
		email: emailSchema,
		trial_date: trialDateSchema,
		name: trialNameSchema,
		furigana: furiganaSchema,
		gender: genderSchema,
		birth_date: birthDateSchema,
		school_name: schoolNameSchema,
		cram_school: cramSchoolSchema,
		phone_number: phoneNumberSchema,
		motivation: motivationSchema,
		motivation_other: motivationOtherSchema,
		referrer_name: referrerNameSchema,
	})
	.superRefine((data, ctx) => {
		if (data.motivation === "other" && !data.motivation_other) {
			ctx.addIssue({
				code: "custom",
				path: ["motivation_other"],
				message: "きっかけで「その他」を選んだ場合は内容を入力してください。",
			});
		}
	});

type TrialFormValues = z.infer<typeof trialFormSchema>;
// 同意チェックは back に送らないため、スキーマの外でエラーを持つ
type FieldErrors = Partial<Record<keyof TrialFormValues | "privacy", string>>;
type Status = "idle" | "sending" | "done" | "error";

/**
 * 日付が変わったら React に知らせる。フォームを開いたまま日をまたいでも、
 * 今日になった練習日を選択肢から外せるように、次の0時とタブに戻ったときに再取得させる
 */
function subscribeToday(onChange: () => void): () => void {
	let timer: ReturnType<typeof setTimeout>;
	const scheduleMidnight = () => {
		const now = new Date();
		const nextMidnight = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate() + 1,
		);
		timer = setTimeout(() => {
			onChange();
			scheduleMidnight();
		}, nextMidnight.getTime() - now.getTime());
	};
	const onVisibilityChange = () => {
		if (document.visibilityState === "visible") onChange();
	};
	scheduleMidnight();
	document.addEventListener("visibilitychange", onVisibilityChange);
	return () => {
		clearTimeout(timer);
		document.removeEventListener("visibilitychange", onVisibilityChange);
	};
}

/** 同じ日なら同じ値を返す（useSyncExternalStore のスナップショットとして安定させる） */
function getTodayKey(): string {
	const now = new Date();
	return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

function parseTodayKey(key: string): Date {
	const [year, month, date] = key.split("-").map(Number);
	return new Date(year, month, date);
}

type Props = {
	/** 活動内容ページの練習日から来たときに、最初から選んでおく体験希望日（YYYY-MM-DD） */
	initialTrialDate?: string;
};

/** ドッジボール体験の申し込みフォーム（Figmaデザイン未作成のため仮デザイン） */
export function TrialForm({ initialTrialDate }: Props) {
	const [errors, setErrors] = useState<FieldErrors>({});
	const [status, setStatus] = useState<Status>("idle");
	const [submitError, setSubmitError] = useState<string | null>(null);
	// 「その他」「紹介」を選んだときだけ追加の入力欄を出すため、きっかけだけ state で持つ
	const [motivation, setMotivation] = useState("");
	const [privacyAgreed, setPrivacyAgreed] = useState(false);
	// 体験希望日は練習日からだけ選べるようにする。今日はビルド時と閲覧時でずれるため、クライアントでのみ取得する（サーバーでは null）
	const todayKey = useSyncExternalStore(
		subscribeToday,
		getTodayKey,
		() => null,
	);
	const practiceDates = todayKey
		? upcomingPracticeDates(parseTodayKey(todayKey))
		: [];
	const [trialDate, setTrialDate] = useState(initialTrialDate ?? "");
	// 選択肢にない日（期間外・練習日でない日）がクエリで渡されたときは未選択にする
	const selectedTrialDate = practiceDates.some((d) => d.value === trialDate)
		? trialDate
		: "";

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const parsed = trialFormSchema.safeParse(Object.fromEntries(form));
		if (!parsed.success || !privacyAgreed) {
			const fieldErrors: FieldErrors = {};
			for (const issue of parsed.error?.issues ?? []) {
				const key = issue.path[0] as keyof TrialFormValues;
				fieldErrors[key] ??= issue.message;
			}
			if (!privacyAgreed) fieldErrors.privacy = PRIVACY_CONSENT_ERROR;
			setErrors(fieldErrors);
			return;
		}
		setErrors({});
		setSubmitError(null);
		setStatus("sending");

		// back は parseBody で受け取るため JSON ではなく FormData で送る。
		// 空欄の任意項目（undefined）は送らない
		const payload = new FormData();
		for (const [key, value] of Object.entries(parsed.data)) {
			if (value !== undefined) payload.append(key, value);
		}
		try {
			await postForm("/api/trial-application", payload);
			setStatus("done");
		} catch (error) {
			setSubmitError(
				toErrorMessage(
					error,
					"送信に失敗しました。時間をおいて再度お試しください。",
				),
			);
			setStatus("error");
		}
	};

	if (status === "done") {
		return (
			<p className="text-center">
				お申し込みを受け付けました。
				<br />
				確認メールをお送りしましたので、ご確認ください。
			</p>
		);
	}

	return (
		<form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
			<FormField
				label="体験希望日"
				htmlFor="trial_date"
				error={errors.trial_date}
				required
			>
				<select
					id="trial_date"
					name="trial_date"
					value={selectedTrialDate}
					onChange={(event) => setTrialDate(event.target.value)}
					className={fieldClass}
				>
					<option value="" disabled>
						練習日から選んでください
					</option>
					{practiceDates.map((date) => (
						<option key={date.value} value={date.value}>
							{date.label}
						</option>
					))}
				</select>
			</FormField>
			<FormField label="お名前" htmlFor="name" error={errors.name} required>
				<input id="name" name="name" className={fieldClass} />
			</FormField>
			<FormField
				label="フリガナ"
				htmlFor="furigana"
				error={errors.furigana}
				required
			>
				<input
					id="furigana"
					name="furigana"
					placeholder="ニシオ タロウ"
					className={fieldClass}
				/>
			</FormField>
			<FormField label="性別" htmlFor="gender" error={errors.gender} required>
				<select
					id="gender"
					name="gender"
					defaultValue=""
					className={fieldClass}
				>
					<option value="" disabled>
						選択してください
					</option>
					{genderSchema.options.map((value) => (
						<option key={value} value={value}>
							{GENDER_LABELS[value]}
						</option>
					))}
				</select>
			</FormField>
			<FormField
				label="生年月日"
				htmlFor="birth_date"
				error={errors.birth_date}
				required
			>
				<input
					id="birth_date"
					name="birth_date"
					type="date"
					className={fieldClass}
				/>
			</FormField>
			<FormField
				label="学校名"
				htmlFor="school_name"
				error={errors.school_name}
				required
			>
				<input id="school_name" name="school_name" className={fieldClass} />
			</FormField>
			<FormField label="塾" htmlFor="cram_school" error={errors.cram_school}>
				<input id="cram_school" name="cram_school" className={fieldClass} />
			</FormField>
			<FormField
				label="連絡の取れる電話番号"
				htmlFor="phone_number"
				error={errors.phone_number}
				required
			>
				<input
					id="phone_number"
					name="phone_number"
					type="tel"
					autoComplete="tel"
					placeholder="090-1234-5678"
					className={fieldClass}
				/>
			</FormField>
			<FormField
				label="メールアドレス"
				htmlFor="email"
				error={errors.email}
				required
			>
				<input
					id="email"
					name="email"
					type="email"
					autoComplete="email"
					placeholder="example@example.com"
					className={fieldClass}
				/>
			</FormField>
			<FormField
				label="体験のきっかけ"
				htmlFor="motivation"
				error={errors.motivation}
				required
			>
				<select
					id="motivation"
					name="motivation"
					value={motivation}
					onChange={(event) => setMotivation(event.target.value)}
					className={fieldClass}
				>
					<option value="" disabled>
						選択してください
					</option>
					{motivationSchema.options.map((value) => (
						<option key={value} value={value}>
							{MOTIVATION_LABELS[value]}
						</option>
					))}
				</select>
			</FormField>
			{motivation === "other" && (
				<FormField
					label="きっかけ（その他）"
					htmlFor="motivation_other"
					error={errors.motivation_other}
					required
				>
					<input
						id="motivation_other"
						name="motivation_other"
						className={fieldClass}
					/>
				</FormField>
			)}
			{motivation === "referral" && (
				<FormField
					label="紹介者のお名前"
					htmlFor="referrer_name"
					error={errors.referrer_name}
				>
					<input
						id="referrer_name"
						name="referrer_name"
						className={fieldClass}
					/>
				</FormField>
			)}
			<PrivacyConsent
				checked={privacyAgreed}
				onChange={setPrivacyAgreed}
				error={errors.privacy}
			/>
			{status === "error" && submitError && (
				<p role="alert" className="text-[14px] text-brand-red">
					{submitError}
				</p>
			)}
			<button
				type="submit"
				disabled={status === "sending"}
				className={`mx-auto ${primaryButtonClass}`}
			>
				{status === "sending" ? "送信中…" : "申し込む"}
			</button>
		</form>
	);
}
