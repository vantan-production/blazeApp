"use client";

import { useId } from "react";

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

/**
 * お問い合わせフォーム（Figma: signup-inputs-contents 980:405）。
 * Figmaにある「パスワード」欄はお問い合わせに不要なため置いていない。
 */
export function InquiryForm() {
	const emailId = useId();
	const messageId = useId();

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		// TODO: 確認画面・送信先APIが決まったら実装する
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="flex w-full flex-col items-center gap-9 px-[10px]"
		>
			<div className="flex w-full flex-col gap-5">
				<div className="flex flex-col gap-2 px-[clamp(10px,calc(12.2vw-29px),20px)] py-[7.5px]">
					<RequiredLabel htmlFor={emailId}>メールアドレス</RequiredLabel>
					<input
						id={emailId}
						name="email"
						type="email"
						required
						autoComplete="email"
						placeholder="example@example.com"
						className={`h-[45px] ${fieldClass}`}
					/>
				</div>
				<div className="flex flex-col gap-2 px-[clamp(10px,calc(12.2vw-29px),20px)] py-[7.5px]">
					<RequiredLabel htmlFor={messageId}>
						お問い合わせ内容を書いてください
					</RequiredLabel>
					<textarea
						id={messageId}
						name="message"
						required
						className={`h-[210px] resize-none py-3 ${fieldClass}`}
					/>
				</div>
			</div>
			<div className="flex w-full justify-center px-[10px] pt-[15px] pb-[10px]">
				<button
					type="submit"
					className="h-[47px] w-full max-w-[342px] cursor-pointer rounded-[30px] bg-brand-yellow text-[14px] font-medium text-[#222]"
				>
					確認
				</button>
			</div>
		</form>
	);
}
