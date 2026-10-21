"use client";

import Image from "next/image";
import { useId, useState } from "react";

/**
 * card: 白い認証カード上の入力欄（ログイン 1700:3248）
 * dark: 青背景上の入力欄（ニュース投稿 2030:1576）
 */
export type AdminFieldTone = "card" | "dark";

const labelClass: Record<AdminFieldTone, string> = {
	card: "-mb-1 text-[#505050]",
	dark: "mb-[2px] text-brand-white",
};

const boxClass: Record<AdminFieldTone, string> = {
	card: "bg-[rgba(242,242,247,0.4)] px-[10px]",
	dark: "bg-brand-white px-[22px]",
};

type CommonProps = {
	/** 入力欄の上に出すラベル。省略時は placeholder を読み上げ用ラベルに使う */
	label?: string;
	tone?: AdminFieldTone;
	/** バリデーションエラー */
	error?: string;
	/** 入力欄の右下などに重ねる要素（本文欄の画像ボタンなど） */
	adornment?: React.ReactNode;
};

type InputProps = CommonProps &
	Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & {
		multiline?: false;
	};

type TextareaProps = CommonProps &
	Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
		multiline: true;
	};

type Props = InputProps | TextareaProps;

const inputBaseClass =
	"w-full rounded-[10px] border-[0.3px] border-black text-[12px] leading-[22px] font-medium text-brand-black outline-none placeholder:text-[rgba(80,80,80,0.4)] focus:border-brand-blue focus:ring-1 focus:ring-brand-blue";

/** 管理画面の入力欄（ラベル＋input/textarea＋エラー）。type="password" は表示切替ボタン付き */
export function AdminTextField(props: Props) {
	const generatedId = useId();
	const [showPassword, setShowPassword] = useState(false);
	const {
		label,
		tone = "card",
		error,
		adornment,
		id = generatedId,
		...rest
	} = props;
	const errorId = `${id}-error`;
	const describedBy = error ? errorId : undefined;
	const ariaLabel = label ? undefined : rest.placeholder;

	let control: React.ReactNode;
	let trailing = adornment;
	if (rest.multiline) {
		const { multiline: _multiline, ...textareaProps } = rest;
		control = (
			<textarea
				id={id}
				aria-invalid={error ? true : undefined}
				aria-describedby={describedBy}
				aria-label={ariaLabel}
				className={`${inputBaseClass} ${boxClass[tone]} h-[202px] resize-none py-2 ${adornment ? "pb-14" : ""}`}
				{...textareaProps}
			/>
		);
	} else {
		const { multiline: _multiline, type, ...inputProps } = rest;
		const isPassword = type === "password";
		control = (
			<input
				id={id}
				type={isPassword && showPassword ? "text" : type}
				aria-invalid={error ? true : undefined}
				aria-describedby={describedBy}
				aria-label={ariaLabel}
				className={`${inputBaseClass} ${boxClass[tone]} h-10 ${isPassword ? "pr-11" : ""}`}
				{...inputProps}
			/>
		);
		if (isPassword) {
			trailing = (
				<button
					type="button"
					onClick={() => setShowPassword((prev) => !prev)}
					aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
					aria-pressed={showPassword}
					className="absolute top-1/2 right-[10px] flex -translate-y-1/2 items-center justify-center"
				>
					<Image
						src="/icons/admin/eye.svg"
						alt=""
						width={24}
						height={24}
						className={showPassword ? "opacity-100" : "opacity-60"}
					/>
				</button>
			);
		}
	}

	return (
		<div className="flex w-full flex-col items-start">
			{label && (
				<label
					htmlFor={id}
					className={`text-[12px] leading-[22px] font-medium ${labelClass[tone]}`}
				>
					{label}
				</label>
			)}
			<div className="relative w-full">
				{control}
				{trailing}
			</div>
			{error && <AdminFieldError id={errorId} message={error} tone={tone} />}
		</div>
	);
}

type ErrorProps = {
	id?: string;
	message: string;
	tone?: AdminFieldTone;
};

/** 入力欄の下に出すエラーメッセージ */
export function AdminFieldError({ id, message, tone = "card" }: ErrorProps) {
	return (
		<p
			id={id}
			role="alert"
			className={`mt-1 text-[12px] leading-[18px] ${tone === "card" ? "text-brand-red" : "text-[#ffb4b4]"}`}
		>
			{message}
		</p>
	);
}
