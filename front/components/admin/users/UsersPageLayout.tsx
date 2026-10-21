import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";

type Props = {
	/** 上部の白い見出しボックスの文言 */
	title: string;
	/** 左上の「戻る」の行き先 */
	backHref: string;
	children: React.ReactNode;
};

/**
 * ユーザー管理・招待・削除依頼の画面枠（見出しボックス＋左上の「戻る」）。
 * 共通の AdminPageLayout には「戻る」が無いため、見た目を合わせてこの機能の中に置いている
 */
export function UsersPageLayout({ title, backHref, children }: Props) {
	return (
		<main className="relative flex w-full flex-1 flex-col items-center gap-[40px] px-[27px] pt-[82px] pb-12 text-brand-white">
			<Link
				href={backHref}
				className="absolute top-6 left-[27px] inline-flex items-center gap-1 py-2 pr-2 text-[16px] leading-[16px] font-medium tracking-[1px] text-white transition-opacity hover:opacity-80"
			>
				<svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2.5}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="size-5"
				>
					<path d="M15 18l-6-6 6-6" />
				</svg>
				戻る
			</Link>
			<AdminPageTitle>{title}</AdminPageTitle>
			{children}
		</main>
	);
}

/** 画面上部の説明文（仕組みや注意点を短く伝える） */
export function UsersNote({ children }: { children: React.ReactNode }) {
	return (
		<div className="-mt-4 flex w-full flex-col gap-1 rounded-[10px] border border-white/60 px-3 py-2 text-[12px] leading-[20px] tracking-[0.5px]">
			{children}
		</div>
	);
}

/** 一覧の行に並べる小さな丸ボタン（ConsentRequestList の操作ボタンと同じ見た目） */
export function UsersPillButton({
	tone = "light",
	className = "",
	children,
	...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
	tone?: "light" | "dark";
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			className={`flex h-8 items-center rounded-full px-4 text-[14px] leading-[22px] tracking-[1px] shadow-[0px_2px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${tone === "light" ? "bg-brand-white text-brand-blue" : "bg-brand-blue text-brand-white ring-1 ring-white/60"} ${className}`}
			{...rest}
		>
			{children}
		</button>
	);
}

/** 白いタグ（ロール・状態の表示） */
export function UsersTag({ children }: { children: React.ReactNode }) {
	return (
		<span className="shrink-0 rounded-[200px] bg-white px-[10px] text-[12px] leading-[22px] tracking-[1px] text-brand-blue">
			{children}
		</span>
	);
}
