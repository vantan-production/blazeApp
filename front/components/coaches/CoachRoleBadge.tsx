export type CoachRole = "director" | "coach";

const roleStyles: Record<CoachRole, { label: string; className: string }> = {
	// 監督はサイトの見出しと同じ黄色、コーチはタグと同じ白で色分けする
	director: { label: "監督", className: "bg-brand-yellow" },
	coach: { label: "コーチ", className: "bg-brand-white" },
};

type Props = {
	role: CoachRole;
};

/** 名前の横に置く役職バッジ（監督／コーチ） */
export function CoachRoleBadge({ role }: Props) {
	const { label, className } = roleStyles[role];
	return (
		<span
			className={`inline-flex shrink-0 items-center justify-center rounded-[1000px] px-3 text-[13px] leading-[22px] font-medium tracking-[1px] whitespace-nowrap text-brand-blue ${className}`}
		>
			{label}
		</span>
	);
}
