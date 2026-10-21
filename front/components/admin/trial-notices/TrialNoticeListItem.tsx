import Image from "next/image";
import Link from "next/link";
import { adminTrialNoticeDetailPath } from "@/lib/admin/routes";
import { formatSentAt, type TrialNoticeListItem as Item } from "./types";

type Props = {
	notice: Item;
};

/** 送信履歴一覧の一行（問い合わせ一覧の行と同じ見た目）。タップで詳細へ */
export function TrialNoticeListItem({ notice }: Props) {
	return (
		<li>
			<Link
				href={adminTrialNoticeDetailPath(notice.id)}
				className="flex min-h-20 w-full items-center gap-4 border border-brand-white px-3 py-2 transition-opacity hover:opacity-80"
			>
				<span className="flex min-w-0 flex-1 flex-col text-white">
					<span className="truncate text-[18px] leading-[22px] tracking-[1px] text-brand-white">
						{notice.title}
					</span>
					<span className="truncate text-[12px] leading-[18px] tracking-[1px]">
						{notice.recipient_count}名に送信・{notice.admin_name}
					</span>
					<time
						dateTime={notice.created_at}
						className="text-[12px] leading-[18px] tracking-[1px]"
					>
						{formatSentAt(notice.created_at)}
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
