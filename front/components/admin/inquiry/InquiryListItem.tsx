import Image from "next/image";
import Link from "next/link";
import { adminInquiryDetailPath } from "@/lib/admin/routes";
import { InquiryStatusBadge } from "./InquiryStatusBadge";
import { formatDate, type Inquiry } from "./types";

type Props = {
	inquiry: Inquiry;
};

/** 問い合わせ一覧の一行（Figma: Frame 118 2020:1075）。タップで詳細へ */
export function InquiryListItem({ inquiry }: Props) {
	return (
		<li>
			<Link
				href={adminInquiryDetailPath(inquiry.id)}
				className="flex h-20 w-full items-center gap-[25px] border border-brand-white px-[17px] transition-opacity hover:opacity-80"
			>
				<InquiryStatusBadge status={inquiry.status} />
				<span className="flex min-w-0 flex-1 flex-col text-white">
					<span className="truncate text-[18px] leading-[22px] tracking-[1px] text-brand-white">
						{inquiry.title}
					</span>
					<span className="truncate text-[12px] leading-[18px] tracking-[1px]">
						{inquiry.name}
					</span>
					<time className="text-[12px] leading-[18px] tracking-[1px]">
						{formatDate(inquiry.created_at)}
					</time>
				</span>
				<Image
					src="/icons/admin/chevron-right-white.svg"
					alt=""
					width={7.364}
					height={12.728}
				/>
			</Link>
		</li>
	);
}
