"use client";

import { useId, useState } from "react";
import { z } from "zod";
import {
	primaryButtonClass,
	secondaryButtonClass,
} from "@/components/ui/buttonStyles";
import {
	FormField,
	fieldClass,
	PRIVACY_CONSENT_ERROR,
	PrivacyConsent,
} from "@/components/ui/form";
import { postForm, toErrorMessage } from "@/lib/postForm";
import {
	bodySchema,
	emailSchema,
	inquiryNameSchema,
	titleSchema,
} from "@/lib/validation/schemas";

// back/src/inquiry/create.ts と同じ項目・同じ制約
const inquiryFormSchema = z.object({
	name: inquiryNameSchema,
	email: emailSchema,
	title: titleSchema,
	body: bodySchema,
});

type InquiryFormValues = z.infer<typeof inquiryFormSchema>;
// 同意チェックは back に送らないため、スキーマの外でエラーを持つ
type FieldErrors = Partial<Record<keyof InquiryFormValues | "privacy", string>>;
// 入力 → 確認 → 送信中 → 完了
type Step = "input" | "confirm" | "sending" | "done";

const confirmLabels: Record<keyof InquiryFormValues, string> = {
	name: "お名前",
	email: "メールアドレス",
	title: "件名",
	body: "お問い合わせ内容",
};

/**
 * お問い合わせフォーム（Figma: signup-inputs-contents 980:405）。
 * Figmaにある「パスワード」欄はお問い合わせに不要なため置いていない。
 * back の問い合わせAPIが名前・件名も必須にしているため、Figmaに無い2欄を同じ見た目で足している。
 * 入力欄・ボタンの見た目は体験申し込みフォームとそろえ、白パネルの上に置く。
 */
export function InquiryForm() {
	const nameId = useId();
	const emailId = useId();
	const titleId = useId();
	const bodyId = useId();
	const [step, setStep] = useState<Step>("input");
	const [values, setValues] = useState<InquiryFormValues | null>(null);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [privacyAgreed, setPrivacyAgreed] = useState(false);

	// 確認ボタン: 入力チェックだけして確認表示に切り替える（まだ送信しない）
	const handleConfirm = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsed = inquiryFormSchema.safeParse(
			Object.fromEntries(new FormData(event.currentTarget)),
		);
		if (!parsed.success || !privacyAgreed) {
			const fieldErrors: FieldErrors = {};
			for (const issue of parsed.error?.issues ?? []) {
				const key = issue.path[0] as keyof InquiryFormValues;
				fieldErrors[key] ??= issue.message;
			}
			if (!privacyAgreed) fieldErrors.privacy = PRIVACY_CONSENT_ERROR;
			setErrors(fieldErrors);
			return;
		}
		setErrors({});
		setSubmitError(null);
		setValues(parsed.data);
		setStep("confirm");
	};

	const handleSend = async () => {
		if (!values) return;
		setStep("sending");
		setSubmitError(null);
		// back は parseBody で受け取るため JSON ではなく FormData で送る
		const payload = new FormData();
		for (const [key, value] of Object.entries(values)) {
			payload.append(key, value);
		}
		try {
			await postForm("/api/inquiry", payload);
			setStep("done");
		} catch (error) {
			setSubmitError(
				toErrorMessage(
					error,
					"送信に失敗しました。時間をおいて再度お試しください。",
				),
			);
			setStep("confirm");
		}
	};

	if (step === "done") {
		return (
			<p className="text-center text-[14px] leading-[1.8]">
				お問い合わせを受け付けました。
				<br />
				確認メールをお送りしましたので、ご確認ください。
			</p>
		);
	}

	const isConfirming = step === "confirm" || step === "sending";

	return (
		<div className="flex w-full flex-col items-center">
			{/* 確認中も入力欄は消さずに隠すだけにして、「戻る」で入力内容が残るようにする */}
			<form
				noValidate
				onSubmit={handleConfirm}
				hidden={isConfirming}
				className="flex w-full flex-col gap-5"
			>
				<FormField label="お名前" htmlFor={nameId} error={errors.name} required>
					<input
						id={nameId}
						name="name"
						autoComplete="name"
						className={fieldClass}
					/>
				</FormField>
				<FormField
					label="メールアドレス"
					htmlFor={emailId}
					error={errors.email}
					required
				>
					<input
						id={emailId}
						name="email"
						type="email"
						autoComplete="email"
						placeholder="example@example.com"
						className={fieldClass}
					/>
				</FormField>
				<FormField label="件名" htmlFor={titleId} error={errors.title} required>
					<input id={titleId} name="title" className={fieldClass} />
				</FormField>
				<FormField
					label="お問い合わせ内容"
					htmlFor={bodyId}
					error={errors.body}
					required
				>
					<textarea
						id={bodyId}
						name="body"
						className={`h-[210px] resize-none ${fieldClass}`}
					/>
				</FormField>
				<PrivacyConsent
					checked={privacyAgreed}
					onChange={setPrivacyAgreed}
					error={errors.privacy}
				/>
				<button type="submit" className={`mx-auto ${primaryButtonClass}`}>
					確認
				</button>
			</form>

			{isConfirming && values && (
				<div className="flex w-full flex-col items-center gap-8">
					<dl className="flex w-full flex-col gap-5">
						{(Object.keys(confirmLabels) as (keyof InquiryFormValues)[]).map(
							(key) => (
								<div key={key} className="flex flex-col gap-[6px]">
									<dt className="text-[14px] font-medium tracking-[1px]">
										{confirmLabels[key]}
									</dt>
									<dd className="text-[16px] break-words whitespace-pre-wrap">
										{values[key]}
									</dd>
								</div>
							),
						)}
					</dl>
					{submitError && (
						<p role="alert" className="text-[14px] text-brand-red">
							{submitError}
						</p>
					)}
					<div className="flex w-full flex-col items-center gap-4">
						<button
							type="button"
							onClick={handleSend}
							disabled={step === "sending"}
							className={primaryButtonClass}
						>
							{step === "sending" ? "送信中…" : "送信する"}
						</button>
						<button
							type="button"
							onClick={() => setStep("input")}
							disabled={step === "sending"}
							className={secondaryButtonClass}
						>
							戻る
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
