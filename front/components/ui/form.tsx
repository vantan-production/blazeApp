import Link from "next/link";
import { routes } from "@/lib/routes";

/**
 * 公開フォーム（体験申し込み・お問い合わせ）共通の部品。どちらも白パネルの上に置く前提の配色にしている。
 * 文字サイズを16px未満にすると iOS Safari が入力時に画面を拡大するため、入力欄は16pxにそろえる。
 */
export const fieldClass =
	"w-full rounded-[8px] border border-brand-blue/30 bg-white px-3 py-[10px] text-[16px] text-brand-black placeholder:text-brand-black/40";

/** 入力欄の下に出す、項目ごとのエラー文 */
export function FieldError({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<p role="alert" className="text-[12px] text-brand-red">
			{message}
		</p>
	);
}

/** 項目名の横に付ける「必須」バッジ */
export function RequiredBadge() {
	return (
		<span className="shrink-0 rounded-[4px] bg-brand-red px-[6px] py-[3px] text-[11px] leading-none font-normal tracking-normal text-brand-white">
			必須
		</span>
	);
}

type FormFieldProps = {
	label: string;
	/** label の htmlFor に使う入力欄の id */
	htmlFor: string;
	error?: string;
	required?: boolean;
	children: React.ReactNode;
};

/** 項目名（＋必須バッジ）・入力欄・エラー文を縦に並べた1項目 */
export function FormField({
	label,
	htmlFor,
	error,
	required,
	children,
}: FormFieldProps) {
	return (
		<div className="flex flex-col gap-[6px] text-left">
			<label
				htmlFor={htmlFor}
				className="flex items-center gap-2 text-[14px] font-medium tracking-[1px]"
			>
				{label}
				{required && <RequiredBadge />}
			</label>
			{children}
			<FieldError message={error} />
		</div>
	);
}

type PrivacyConsentProps = {
	checked: boolean;
	onChange: (checked: boolean) => void;
	error?: string;
};

/** 送信前の「プライバシーポリシーに同意する」チェック。ポリシーは別タブで開き、入力中の内容を消さない */
export function PrivacyConsent({
	checked,
	onChange,
	error,
}: PrivacyConsentProps) {
	return (
		<div className="flex flex-col items-center gap-[6px]">
			<label className="flex cursor-pointer items-center gap-2 text-[14px] whitespace-nowrap">
				<input
					type="checkbox"
					checked={checked}
					onChange={(event) => onChange(event.target.checked)}
					className="size-5 shrink-0 cursor-pointer accent-brand-blue"
				/>
				<span>
					<Link
						href={routes.privacy}
						target="_blank"
						rel="noopener"
						className="underline underline-offset-2"
					>
						プライバシーポリシー
					</Link>
					に同意する
				</span>
				<RequiredBadge />
			</label>
			<FieldError message={error} />
		</div>
	);
}

export const PRIVACY_CONSENT_ERROR = "プライバシーポリシーへの同意が必要です。";
