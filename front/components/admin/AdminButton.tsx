import Link from "next/link";

/**
 * primary: 青地に白文字（ログイン・新規登録 1700:3159）
 * outline: 黒枠に青文字（入口画面の「新規登録」1779:868）
 * light: 白地に青文字（投稿・更新 2030:1593）
 */
export type AdminButtonVariant = "primary" | "outline" | "light";

/** md: 高さ38px（認証カード内・投稿フォーム） / sm: 高さ32px（入口画面） */
export type AdminButtonSize = "md" | "sm";

type StyleOptions = {
	variant?: AdminButtonVariant;
	size?: AdminButtonSize;
	fullWidth?: boolean;
};

const variantClass: Record<AdminButtonVariant, string> = {
	primary: "bg-brand-blue text-white",
	outline: "border border-brand-black text-brand-blue",
	light: "bg-brand-white text-brand-blue",
};

const sizeClass: Record<AdminButtonSize, string> = {
	md: "py-2",
	sm: "h-8",
};

/** 管理画面のボタン見た目（button と Link で共有する） */
export const adminButtonClass = ({
	variant = "primary",
	size = "md",
	fullWidth = true,
}: StyleOptions = {}) =>
	`inline-flex items-center justify-center rounded-[10px] px-4 text-[22px] font-medium leading-[22px] tracking-[1px] whitespace-nowrap shadow-[0px_4px_4px_rgba(0,0,0,0.15),0px_1px_1.5px_rgba(0,0,0,0.3)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? "w-full" : ""}`;

type ButtonProps = StyleOptions &
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		children: React.ReactNode;
	};

/** 管理画面の共通ボタン */
export function AdminButton({
	variant,
	size,
	fullWidth,
	className = "",
	type = "button",
	children,
	...rest
}: ButtonProps) {
	return (
		<button
			type={type}
			className={`${adminButtonClass({ variant, size, fullWidth })} ${className}`}
			{...rest}
		>
			{children}
		</button>
	);
}

type LinkProps = StyleOptions & {
	href: string;
	className?: string;
	children: React.ReactNode;
};

/** ボタン見た目のリンク */
export function AdminButtonLink({
	href,
	variant,
	size,
	fullWidth,
	className = "",
	children,
}: LinkProps) {
	return (
		<Link
			href={href}
			className={`${adminButtonClass({ variant, size, fullWidth })} ${className}`}
		>
			{children}
		</Link>
	);
}
