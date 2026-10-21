"use client";

import { useId, useState } from "react";
import { z } from "zod";
import { postForm, toErrorMessage } from "@/lib/postForm";
import {
	bodySchema,
	emailSchema,
	inquiryNameSchema,
	titleSchema,
} from "@/lib/validation/schemas";

type LabelProps = {
	htmlFor: string;
	children: React.ReactNode;
};

/** 入力欄のラベル＋「必須」バッジ */
function RequiredLabel({ htmlFor, children }: LabelProps) {
	return (
		<label
			htmlFor={htmlFor}
			className="flex items-center gap-[10px] py-[5px] text-[clamp(13px,3.48vw,14px)] font-medium"
		>
			{children}
			<span className="shrink-0 rounded-[4px] bg-[#e53935] px-[7px] py-[5px] text-[12px] leading-none font-normal text-[#f2f2f2]">
				必須
			</span>
		</label>
	);
}

const fieldClass =
	"w-full rounded-[8px] border border-[#aaa] bg-brand-white px-5 text-[14px] font-medium text-brand-black placeholder:text-[#aaa]";

const fieldWrapClass =
	"flex flex-col gap-2 px-[clamp(10px,calc(12.2vw-29px),20px)] py-[7.5px]";

const buttonClass =
	"h-[47px] w-full max-w-[342px] cursor-pointer rounded-[30px] text-[14px] font-medium disabled:opacity-60";

// back/src/inquiry/create.ts と同じ項目・同じ制約
const inquiryFormSchema = z.object({
	name: inquiryNameSchema,
	email: emailSchema,
	title: titleSchema,
	body: bodySchema,
});

type InquiryFormValues = z.infer<typeof inquiryFormSchema>;
type FieldErrors = Partial<Record<keyof InquiryFormValues, string>>;
// 入力 → 確認 → 送信中 → 完了
type Step = "input" | "confirm" | "sending" | "done";

const confirmLabels: Record<keyof InquiryFormValues, string> = {
	name: "お名前",
	email: "メールアドレス",
	title: "件名",
	body: "お問い合わせ内容",
};

function FieldError({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<p role="alert" className="text-[12px] text-[#ff8a80]">
			{message}
		</p>
	);
}

/**
 * お問い合わせフォーム（Figma: signup-inputs-contents 980:405）。
 * Figmaにある「パスワード」欄はお問い合わせに不要なため置いていない。
 * back の問い合わせAPIが名前・件名も必須にしているため、Figmaに無い2欄を同じ見た目で足している。
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

	// 確認ボタン: 入力チェックだけして確認表示に切り替える（まだ送信しない）
	const handleConfirm = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsed = inquiryFormSchema.safeParse(
			Object.fromEntries(new FormData(event.currentTarget)),
		);
		if (!parsed.success) {
			const fieldErrors: FieldErrors = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0] as keyof InquiryFormValues;
				fieldErrors[key] ??= issue.message;
			}
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
			<p className="px-[10px] text-center text-[14px] leading-[1.8]">
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
				className="flex w-full flex-col items-center gap-9 px-[10px]"
			>
				<div className="flex w-full flex-col gap-5">
					<div className={fieldWrapClass}>
						<RequiredLabel htmlFor={nameId}>お名前</RequiredLabel>
						<input
							id={nameId}
							name="name"
							autoComplete="name"
							className={`h-[45px] ${fieldClass}`}
						/>
						<FieldError message={errors.name} />
					</div>
					<div className={fieldWrapClass}>
						<RequiredLabel htmlFor={emailId}>メールアドレス</RequiredLabel>
						<input
							id={emailId}
							name="email"
							type="email"
							autoComplete="email"
							placeholder="example@example.com"
							className={`h-[45px] ${fieldClass}`}
						/>
						<FieldError message={errors.email} />
					</div>
					<div className={fieldWrapClass}>
						<RequiredLabel htmlFor={titleId}>件名</RequiredLabel>
						<input
							id={titleId}
							name="title"
							className={`h-[45px] ${fieldClass}`}
						/>
						<FieldError message={errors.title} />
					</div>
					<div className={fieldWrapClass}>
						<RequiredLabel htmlFor={bodyId}>
							お問い合わせ内容を書いてください
						</RequiredLabel>
						<textarea
							id={bodyId}
							name="body"
							className={`h-[210px] resize-none py-3 ${fieldClass}`}
						/>
						<FieldError message={errors.body} />
					</div>
				</div>
				<div className="flex w-full justify-center px-[10px] pt-[15px] pb-[10px]">
					<button
						type="submit"
						className={`${buttonClass} bg-brand-yellow text-[#222]`}
					>
						確認
					</button>
				</div>
			</form>

			{isConfirming && values && (
				<div className="flex w-full flex-col items-center gap-9 px-[10px]">
					<dl className="flex w-full flex-col gap-5">
						{(Object.keys(confirmLabels) as (keyof InquiryFormValues)[]).map(
							(key) => (
								<div key={key} className={fieldWrapClass}>
									<dt className="py-[5px] text-[clamp(13px,3.48vw,14px)] font-medium">
										{confirmLabels[key]}
									</dt>
									<dd className="text-[14px] break-words whitespace-pre-wrap">
										{values[key]}
									</dd>
								</div>
							),
						)}
					</dl>
					{submitError && (
						<p role="alert" className="text-[14px] text-[#ff8a80]">
							{submitError}
						</p>
					)}
					<div className="flex w-full flex-col items-center gap-4 px-[10px] pt-[15px] pb-[10px]">
						<button
							type="button"
							onClick={handleSend}
							disabled={step === "sending"}
							className={`${buttonClass} bg-brand-yellow text-[#222]`}
						>
							{step === "sending" ? "送信中…" : "送信する"}
						</button>
						<button
							type="button"
							onClick={() => setStep("input")}
							disabled={step === "sending"}
							className={`${buttonClass} border border-brand-white text-brand-white`}
						>
							戻る
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
