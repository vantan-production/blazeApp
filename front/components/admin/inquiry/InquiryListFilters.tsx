"use client";

import { INQUIRY_STATUS_LABELS } from "@/lib/validation/schemas";
import {
	INQUIRY_SEARCH_MAX_LENGTH,
	type InquiryCounts,
	type InquiryTab,
} from "./types";

const tabs: { value: InquiryTab; label: string }[] = [
	{ value: "all", label: "すべて" },
	{ value: "pending", label: INQUIRY_STATUS_LABELS.pending },
	{ value: "in_progress", label: INQUIRY_STATUS_LABELS.in_progress },
	{ value: "resolved", label: INQUIRY_STATUS_LABELS.resolved },
];

type Props = {
	tab: InquiryTab;
	keyword: string;
	/** 各タブの件数（取得前は null で件数を出さない） */
	counts: InquiryCounts | null;
	onTabChange: (tab: InquiryTab) => void;
	onSearch: (keyword: string) => void;
};

/**
 * 問い合わせ一覧の検索欄とステータスのタブ（取り下げ依頼一覧のタブと同じ見た目）。
 * 検索は入力のたびではなく、Enter か「検索」ボタンで確定する
 */
export function InquiryListFilters({
	tab,
	keyword,
	counts,
	onTabChange,
	onSearch,
}: Props) {
	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const value = new FormData(event.currentTarget).get("q");
		onSearch(typeof value === "string" ? value.trim() : "");
	};

	return (
		<div className="flex w-full flex-col gap-4 text-brand-white">
			{/* URL の検索語が変わったら（戻る操作など）入力欄も合わせるため、keyword で作り直す */}
			<form
				key={keyword}
				onSubmit={handleSubmit}
				className="flex items-center gap-2"
			>
				<input
					type="search"
					name="q"
					aria-label="問い合わせを検索"
					placeholder="名前・メール・件名・本文で検索"
					defaultValue={keyword}
					maxLength={INQUIRY_SEARCH_MAX_LENGTH}
					enterKeyHint="search"
					className="h-8 min-w-0 flex-1 rounded-[20px] bg-white px-[11px] text-[12px] font-medium text-brand-black outline-none placeholder:text-[rgba(80,80,80,0.4)] focus:ring-1 focus:ring-brand-yellow"
				/>
				<button
					type="submit"
					className="flex h-8 shrink-0 items-center rounded-full bg-brand-white px-4 text-[14px] leading-[22px] tracking-[1px] text-brand-blue shadow-[0px_2px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-80"
				>
					検索
				</button>
			</form>
			<div
				role="tablist"
				aria-label="対応ステータスで絞り込む"
				className="flex flex-wrap gap-2"
			>
				{tabs.map((item) => (
					<button
						key={item.value}
						type="button"
						role="tab"
						aria-selected={tab === item.value}
						onClick={() => onTabChange(item.value)}
						className={`h-8 rounded-full px-3 text-[14px] leading-[22px] tracking-[1px] ring-1 ring-white/60 transition-opacity hover:opacity-80 ${tab === item.value ? "bg-brand-white text-brand-blue" : "bg-brand-blue text-brand-white"}`}
					>
						{item.label}
						{counts && (
							<span className="ml-1 text-[12px]">{counts[item.value]}</span>
						)}
					</button>
				))}
			</div>
		</div>
	);
}
