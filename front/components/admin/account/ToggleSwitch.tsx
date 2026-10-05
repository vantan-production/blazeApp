"use client";

type Props = {
	checked: boolean;
	onChange: (checked: boolean) => void;
	/** 読み上げ用のラベル（見出しの id を指定する） */
	labelledBy: string;
	describedBy?: string;
	disabled?: boolean;
};

/** オン／オフの切り替えスイッチ（青背景の上で使う。オンは白地に青い丸） */
export function ToggleSwitch({
	checked,
	onChange,
	labelledBy,
	describedBy,
	disabled = false,
}: Props) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-labelledby={labelledBy}
			aria-describedby={describedBy}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={`relative inline-flex h-[30px] w-[52px] shrink-0 items-center rounded-full border border-brand-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-brand-white" : "bg-white/20"}`}
		>
			<span
				aria-hidden="true"
				className={`absolute top-1/2 left-[3px] size-[22px] -translate-y-1/2 rounded-full shadow-[0px_1px_3px_rgba(0,0,0,0.3)] transition-transform ${checked ? "translate-x-[22px] bg-brand-blue" : "translate-x-0 bg-brand-white"}`}
			/>
		</button>
	);
}
