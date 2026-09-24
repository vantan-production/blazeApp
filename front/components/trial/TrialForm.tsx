"use client";

import { useState } from "react";
import { z } from "zod";
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
type FieldErrors = Partial<Record<keyof TrialFormValues, string>>;
type Status = "idle" | "sending" | "done" | "error";

const inputClass =
	"w-full rounded-[8px] border border-brand-blue/30 bg-white px-3 py-2 text-[16px] text-brand-black";

/** ドッジボール体験の申し込みフォーム（Figmaデザイン未作成のため仮デザイン） */
export function TrialForm() {
	const [errors, setErrors] = useState<FieldErrors>({});
	const [status, setStatus] = useState<Status>("idle");
	const [submitError, setSubmitError] = useState<string | null>(null);
	// 「その他」「紹介」を選んだときだけ追加の入力欄を出すため、きっかけだけ state で持つ
	const [motivation, setMotivation] = useState("");

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const parsed = trialFormSchema.safeParse(Object.fromEntries(form));
		if (!parsed.success) {
			const fieldErrors: FieldErrors = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0] as keyof TrialFormValues;
				fieldErrors[key] ??= issue.message;
			}
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
			<Field
				label="体験希望日"
				name="trial_date"
				error={errors.trial_date}
				required
			>
				<input
					id="trial_date"
					name="trial_date"
					type="date"
					className={inputClass}
				/>
			</Field>
			<Field label="お名前" name="name" error={errors.name} required>
				<input id="name" name="name" className={inputClass} />
			</Field>
			<Field label="フリガナ" name="furigana" error={errors.furigana} required>
				<input
					id="furigana"
					name="furigana"
					placeholder="ニシオ タロウ"
					className={inputClass}
				/>
			</Field>
			<Field label="性別" name="gender" error={errors.gender} required>
				<select
					id="gender"
					name="gender"
					defaultValue=""
					className={inputClass}
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
			</Field>
			<Field
				label="生年月日"
				name="birth_date"
				error={errors.birth_date}
				required
			>
				<input
					id="birth_date"
					name="birth_date"
					type="date"
					className={inputClass}
				/>
			</Field>
			<Field
				label="学校名"
				name="school_name"
				error={errors.school_name}
				required
			>
				<input id="school_name" name="school_name" className={inputClass} />
			</Field>
			<Field label="塾" name="cram_school" error={errors.cram_school}>
				<input id="cram_school" name="cram_school" className={inputClass} />
			</Field>
			<Field
				label="連絡の取れる電話番号"
				name="phone_number"
				error={errors.phone_number}
				required
			>
				<input
					id="phone_number"
					name="phone_number"
					type="tel"
					autoComplete="tel"
					placeholder="090-1234-5678"
					className={inputClass}
				/>
			</Field>
			<Field label="メールアドレス" name="email" error={errors.email} required>
				<input
					id="email"
					name="email"
					type="email"
					autoComplete="email"
					placeholder="example@example.com"
					className={inputClass}
				/>
			</Field>
			<Field
				label="体験のきっかけ"
				name="motivation"
				error={errors.motivation}
				required
			>
				<select
					id="motivation"
					name="motivation"
					value={motivation}
					onChange={(event) => setMotivation(event.target.value)}
					className={inputClass}
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
			</Field>
			{motivation === "other" && (
				<Field
					label="きっかけ（その他）"
					name="motivation_other"
					error={errors.motivation_other}
					required
				>
					<input
						id="motivation_other"
						name="motivation_other"
						className={inputClass}
					/>
				</Field>
			)}
			{motivation === "referral" && (
				<Field
					label="紹介者のお名前"
					name="referrer_name"
					error={errors.referrer_name}
				>
					<input
						id="referrer_name"
						name="referrer_name"
						className={inputClass}
					/>
				</Field>
			)}
			{status === "error" && submitError && (
				<p role="alert" className="text-[14px] text-brand-red">
					{submitError}
				</p>
			)}
			<button
				type="submit"
				disabled={status === "sending"}
				className="mx-auto cursor-pointer rounded-[1000px] bg-brand-yellow px-[52px] py-4 text-[18px] font-medium tracking-[1px] text-brand-blue disabled:opacity-60"
			>
				{status === "sending" ? "送信中…" : "申し込む"}
			</button>
		</form>
	);
}

type FieldProps = {
	label: string;
	name: string;
	error?: string;
	required?: boolean;
	children: React.ReactNode;
};

function Field({ label, name, error, required, children }: FieldProps) {
	return (
		<div className="flex flex-col gap-1 text-left">
			<label htmlFor={name} className="text-[14px] tracking-[1px]">
				{label}
				{required && <span className="ml-1 text-brand-red">*</span>}
			</label>
			{children}
			{error && (
				<p role="alert" className="text-[12px] text-brand-red">
					{error}
				</p>
			)}
		</div>
	);
}
