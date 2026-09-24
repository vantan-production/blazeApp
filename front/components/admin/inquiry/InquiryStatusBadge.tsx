import {
	INQUIRY_STATUS_LABELS,
	type InquiryStatus,
} from "@/lib/validation/schemas";

// 未対応・対応済は Figma（2025:1235 / 2027:1188）の配色。対応中はデザインが無いため黄色系で仮置き
const statusClass: Record<InquiryStatus, string> = {
	pending: "bg-[#ffd6d6] text-[#ff0004]",
	in_progress: "bg-[#fff1b8] text-[#9a7400]",
	resolved: "bg-[#d1f0ae] text-[#00af00]",
};

type Props = {
	status: InquiryStatus;
	/** 対応した管理者名（対応済バッジの下に小さく表示。Figma 2424:1036） */
	handlerName?: string;
};

/** 問い合わせの対応ステータスのバッジ */
export function InquiryStatusBadge({ status, handlerName }: Props) {
	return (
		<span
			className={`inline-flex shrink-0 flex-col items-center justify-center rounded-[6px] px-2 py-1 whitespace-nowrap ${statusClass[status]}`}
		>
			<span className="text-[16px] leading-[22px] tracking-[1.5px]">
				{INQUIRY_STATUS_LABELS[status]}
			</span>
			{handlerName && (
				<span className="text-[10px] leading-[12px] tracking-[1px] text-black">
					{handlerName}
				</span>
			)}
		</span>
	);
}
