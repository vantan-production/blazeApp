"use client";

import { AdminTextField } from "@/components/admin/AdminTextField";
import {
	formatTrialDate,
	groupByTrialDate,
	type TrialCandidate,
} from "./types";

type Props = {
	/** 体験日の絞り込み（YYYY-MM-DD）。空なら今日以降すべて */
	trialDate: string;
	onTrialDateChange: (value: string) => void;
	candidates: TrialCandidate[];
	loading: boolean;
	error: string | null;
	selectedIds: ReadonlySet<string>;
	onToggle: (id: string) => void;
	/** 表示中の候補をまとめて選択/解除する */
	onToggleMany: (ids: string[], selected: boolean) => void;
};

/** 宛先（体験申込者）を選ぶ欄。体験日ごとにまとめてチェックボックスで選ぶ */
export function CandidatePicker({
	trialDate,
	onTrialDateChange,
	candidates,
	loading,
	error,
	selectedIds,
	onToggle,
	onToggleMany,
}: Props) {
	const groups = groupByTrialDate(candidates);
	const visibleIds = candidates.map((candidate) => candidate.id);
	const allVisibleSelected =
		visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
	// 絞り込みを変えても選択は残すので、今の一覧に出ていない選択済みの人数も知らせる
	const hiddenSelectedCount = [...selectedIds].filter(
		(id) => !visibleIds.includes(id),
	).length;

	return (
		<section
			aria-labelledby="trial-notice-recipients-heading"
			className="flex w-full flex-col gap-3 text-white"
		>
			<h2
				id="trial-notice-recipients-heading"
				className="text-[16px] leading-[22px] font-medium tracking-[1px]"
			>
				宛先を選ぶ
			</h2>

			<div className="flex w-full items-end gap-2">
				<AdminTextField
					tone="dark"
					type="date"
					label="体験日で絞り込む"
					value={trialDate}
					onChange={(event) => onTrialDateChange(event.target.value)}
				/>
				{trialDate && (
					<button
						type="button"
						onClick={() => onTrialDateChange("")}
						className="h-10 shrink-0 text-[12px] leading-[18px] tracking-[1px] text-brand-white underline"
					>
						すべて表示
					</button>
				)}
			</div>
			<p className="text-[10px] leading-[16px] tracking-[1px]">
				空欄のときは、今日以降に体験予定の方をすべて表示します。
			</p>

			<div className="flex items-center justify-between gap-2 text-[12px] leading-[18px] tracking-[1px]">
				<p aria-live="polite">
					選択中 <span className="text-[16px]">{selectedIds.size}</span> 名
					{hiddenSelectedCount > 0 &&
						`（うち${hiddenSelectedCount}名は一覧に表示されていません）`}
				</p>
				<button
					type="button"
					onClick={() => onToggleMany(visibleIds, !allVisibleSelected)}
					disabled={visibleIds.length === 0}
					className="shrink-0 underline disabled:opacity-50"
				>
					{allVisibleSelected ? "表示中を解除" : "表示中を全選択"}
				</button>
			</div>

			{error && <p className="text-[14px]">{error}</p>}
			{!error && loading && <p className="text-[14px]">読み込み中…</p>}
			{!error && !loading && candidates.length === 0 && (
				<p className="text-[14px]">該当する体験申込者はいません。</p>
			)}

			{!error && !loading && groups.length > 0 && (
				<div className="flex flex-col gap-4">
					{groups.map((group) => (
						<fieldset key={group.trialDate} className="flex flex-col gap-2">
							<legend className="mb-2 text-[14px] leading-[22px] tracking-[1px]">
								{`体験日 ${formatTrialDate(group.trialDate)}（${group.candidates.length}名）`}
							</legend>
							{group.candidates.map((candidate) => (
								<label
									key={candidate.id}
									className="flex cursor-pointer items-center gap-3 border border-brand-white px-3 py-2 has-[:checked]:bg-white/15"
								>
									<input
										type="checkbox"
										checked={selectedIds.has(candidate.id)}
										onChange={() => onToggle(candidate.id)}
										className="size-5 shrink-0 accent-brand-white"
									/>
									<span className="flex min-w-0 flex-1 flex-col text-[12px] leading-[18px] tracking-[1px]">
										<span className="text-[10px]">{candidate.furigana}</span>
										<span className="text-[16px] leading-[22px] break-all">
											{candidate.name}
										</span>
										<span className="break-all">{candidate.email}</span>
									</span>
								</label>
							))}
						</fieldset>
					))}
				</div>
			)}
		</section>
	);
}
