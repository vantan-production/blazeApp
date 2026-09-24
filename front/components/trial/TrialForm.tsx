"use client";

import { useState } from "react";
import { z } from "zod";
import { API_BASE_URL } from "@/lib/apiClient";
import {
	bodySchema,
	emailSchema,
	inquiryNameSchema,
} from "@/lib/validation/schemas";

const grades = ["1年生", "2年生", "3年生", "4年生", "5年生", "6年生"];

const trialFormSchema = z.object({
	parentName: inquiryNameSchema,
	email: emailSchema,
	childName: z.string().trim().min(1, "お子さまのお名前を入力してください。"),
	grade: z
		.string({ error: "学年を選択してください。" })
		.min(1, "学年を選択してください。"),
	phone: z
		.string()
		.trim()
		.regex(/^[0-9-]*$/, "電話番号は数字とハイフンで入力してください。"),
	preferredDate: z.string(),
	message: z.string().trim(),
});

type TrialFormValues = z.infer<typeof trialFormSchema>;
type FieldErrors = Partial<Record<keyof TrialFormValues, string>>;
type Status = "idle" | "sending" | "done" | "error";

/** 体験申し込みは問い合わせAPIに「体験申し込み」件名で送る（専用APIは未作成） */
const buildInquiryBody = (values: TrialFormValues) =>
	[
		`お子さまのお名前: ${values.childName}`,
		`学年: ${values.grade}`,
		`電話番号: ${values.phone || "未入力"}`,
		`体験希望日: ${values.preferredDate || "未入力"}`,
		"",
		values.message || "（ご質問・ご要望なし）",
	].join("\n");

const inputClass =
	"w-full rounded-[8px] border border-brand-blue/30 bg-white px-3 py-2 text-[16px] text-brand-black";

/** ドッジボール体験の申し込みフォーム（Figmaデザイン未作成のため仮デザイン） */
export function TrialForm() {
	const [errors, setErrors] = useState<FieldErrors>({});
	const [status, setStatus] = useState<Status>("idle");

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
		const body = buildInquiryBody(parsed.data);
		const bodyResult = bodySchema.safeParse(body);
		if (!bodyResult.success) {
			setErrors({ message: bodyResult.error.issues[0].message });
			return;
		}
		setErrors({});
		setStatus("sending");

		const payload = new FormData();
		payload.append("name", parsed.data.parentName);
		payload.append("email", parsed.data.email);
		payload.append("title", "体験申し込み");
		payload.append("body", bodyResult.data);
		try {
			const response = await fetch(`${API_BASE_URL}/api/inquiry`, {
				method: "POST",
				body: payload,
			});
			setStatus(response.ok ? "done" : "error");
		} catch {
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
				label="保護者のお名前"
				name="parentName"
				error={errors.parentName}
				required
			>
				<input
					id="parentName"
					name="parentName"
					autoComplete="name"
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
				label="お子さまのお名前"
				name="childName"
				error={errors.childName}
				required
			>
				<input id="childName" name="childName" className={inputClass} />
			</Field>
			<Field label="学年" name="grade" error={errors.grade} required>
				<select id="grade" name="grade" defaultValue="" className={inputClass}>
					<option value="" disabled>
						選択してください
					</option>
					{grades.map((grade) => (
						<option key={grade} value={grade}>
							{grade}
						</option>
					))}
				</select>
			</Field>
			<Field label="電話番号" name="phone" error={errors.phone}>
				<input
					id="phone"
					name="phone"
					type="tel"
					autoComplete="tel"
					placeholder="090-1234-5678"
					className={inputClass}
				/>
			</Field>
			<Field
				label="体験希望日"
				name="preferredDate"
				error={errors.preferredDate}
			>
				<input
					id="preferredDate"
					name="preferredDate"
					type="date"
					className={inputClass}
				/>
			</Field>
			<Field label="ご質問・ご要望" name="message" error={errors.message}>
				<textarea id="message" name="message" rows={4} className={inputClass} />
			</Field>
			{status === "error" && (
				<p role="alert" className="text-[14px] text-brand-red">
					送信に失敗しました。時間をおいて再度お試しください。
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
