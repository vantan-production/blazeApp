import Link from "next/link";
import { formatNoticeDate, type Notice } from "@/lib/admin/notices";
import { adminNoticeDetailPath } from "@/lib/admin/routes";
import { NoticeTags } from "./NoticeTags";

type Props = {
	notice: Notice;
};

/** お知らせ一覧の一行。ニュース一覧と同じく日付＋タイトル＋白い区切り線。行全体が詳細画面へのリンク */
export function NoticeListItem({ notice }: Props) {
	return (
		<li className="flex flex-col gap-6 after:h-px after:w-full after:bg-white">
			<Link
				href={adminNoticeDetailPath(notice.id)}
				className="flex flex-col gap-1 text-brand-white transition-opacity hover:opacity-80"
			>
				<div className="flex flex-wrap items-center gap-2">
					<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
						{formatNoticeDate(notice.created_at)}
					</time>
					<NoticeTags notice={notice} />
				</div>
				<p className="text-[18px] leading-[26px] tracking-[1px] break-all">
					{notice.title}
				</p>
				<p className="text-[12px] leading-[18px] tracking-[1px] opacity-80">
					投稿: {notice.admin_name}
				</p>
			</Link>
		</li>
	);
}
