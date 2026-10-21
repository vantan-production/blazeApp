"use client";

import { AdminFieldError } from "@/components/admin/AdminTextField";
import { SURVEY_OPTION_MAX, SURVEY_OPTION_MIN } from "@/lib/admin/surveys";

/** 入力中の選択肢。key は並べ替え・削除しても入力欄を取り違えないための画面内だけの印 */
export type SurveyOptionDraft = {
	key: string;
	label: string;
};

type Props = {
	options: SurveyOptionDraft[];
	onChange: (options: SurveyOptionDraft[]) => void;
	error?: string;
};

/** 出欠確認でよく使う選択肢 */
const ATTENDANCE_LABELS = ["出席", "欠席", "未定"];

export const newOptionDraft = (label = ""): SurveyOptionDraft => ({
	key: crypto.randomUUID(),
	label,
});

const iconButtonClass =
	"flex size-8 shrink-0 items-center justify-center rounded-[8px] text-brand-white ring-1 ring-white/40 transition-opacity hover:opacity-80 disabled:opacity-30";

/**
 * アンケートの選択肢の入力欄。行ごとに上下の並べ替えと削除ができ、下の「選択肢を追加」で増やせる。
 * 数は back の制約（2〜20個）の範囲に収める
 */
export function SurveyOptionsEditor({ options, onChange, error }: Props) {
	const update = (key: string, label: string) =>
		onChange(
			options.map((option) =>
				option.key === key ? { ...option, label } : option,
			),
		);

	const move = (index: number, offset: -1 | 1) => {
		const target = index + offset;
		if (target < 0 || target >= options.length) return;
		const next = [...options];
		[next[index], next[target]] = [next[target], next[index]];
		onChange(next);
	};

	const remove = (key: string) =>
		onChange(options.filter((option) => option.key !== key));

	const allEmpty = options.every((option) => option.label.trim() === "");

	return (
		<fieldset className="flex w-full flex-col gap-2">
			<legend className="mb-[2px] text-[12px] leading-[22px] font-medium text-brand-white">
				選択肢（{SURVEY_OPTION_MIN}〜{SURVEY_OPTION_MAX}個・上から順に表示）
			</legend>
			{allEmpty && (
				<button
					type="button"
					onClick={() => onChange(ATTENDANCE_LABELS.map(newOptionDraft))}
					className="self-start text-[12px] leading-[22px] tracking-[1px] text-brand-white underline transition-opacity hover:opacity-80"
				>
					出欠確認のひな形を入れる（{ATTENDANCE_LABELS.join("・")}）
				</button>
			)}
			<ol className="flex flex-col gap-2">
				{options.map((option, index) => (
					<li key={option.key} className="flex items-center gap-1">
						<span className="w-5 shrink-0 text-center text-[12px] leading-[22px] text-brand-white">
							{index + 1}
						</span>
						<input
							type="text"
							value={option.label}
							onChange={(event) => update(option.key, event.target.value)}
							placeholder={`選択肢${index + 1}`}
							aria-label={`選択肢${index + 1}`}
							className="h-10 min-w-0 flex-1 rounded-[10px] border-[0.3px] border-black bg-brand-white px-3 text-[12px] leading-[22px] font-medium text-brand-black outline-none placeholder:text-[rgba(80,80,80,0.4)] focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
						/>
						<button
							type="button"
							onClick={() => move(index, -1)}
							disabled={index === 0}
							aria-label={`選択肢${index + 1}を上へ`}
							className={iconButtonClass}
						>
							<ChevronIcon direction="up" />
						</button>
						<button
							type="button"
							onClick={() => move(index, 1)}
							disabled={index === options.length - 1}
							aria-label={`選択肢${index + 1}を下へ`}
							className={iconButtonClass}
						>
							<ChevronIcon direction="down" />
						</button>
						<button
							type="button"
							onClick={() => remove(option.key)}
							disabled={options.length <= SURVEY_OPTION_MIN}
							aria-label={`選択肢${index + 1}を削除`}
							className={`${iconButtonClass} text-[#ff8a8d] ring-[#ff8a8d]/60`}
						>
							<svg
								aria-hidden="true"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={2.5}
								strokeLinecap="round"
								className="size-4"
							>
								<path d="M6 6l12 12M18 6L6 18" />
							</svg>
						</button>
					</li>
				))}
			</ol>
			<button
				type="button"
				onClick={() => onChange([...options, newOptionDraft()])}
				disabled={options.length >= SURVEY_OPTION_MAX}
				className="flex h-10 items-center justify-center gap-1 rounded-[10px] border border-dashed border-white/60 text-[14px] leading-[22px] tracking-[1px] text-brand-white transition-opacity hover:opacity-80 disabled:opacity-40"
			>
				<svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2.5}
					strokeLinecap="round"
					className="size-4"
				>
					<path d="M12 5v14M5 12h14" />
				</svg>
				選択肢を追加
			</button>
			{error && <AdminFieldError message={error} tone="dark" />}
		</fieldset>
	);
}

function ChevronIcon({ direction }: { direction: "up" | "down" }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.5}
			strokeLinecap="round"
			strokeLinejoin="round"
			className="size-4"
		>
			<path d={direction === "up" ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
		</svg>
	);
}
