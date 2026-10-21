"use client";

import Link from "next/link";
import { formatDate } from "@/lib/members/format";
import type { Notice } from "@/lib/members/notices";
import { memberNoticeDetailPath } from "@/lib/members/routes";
import { MemberTag } from "../MemberTag";
import { PagedListStatus } from "../PagedListStatus";
import { usePagedList } from "../usePagedList";

/** 関係者限定お知らせの一覧（GET /api/notices。自分の既読フラグ付き・10件ずつ追加読み込み） */
export function NoticeList() {
	const { items, loading, error, hasMore, loadMore } = usePagedList<Notice>(
		"/api/notices",
		"お知らせの取得に失敗しました。",
	);

	return (
		<PagedListStatus
			loading={loading}
			error={error}
			count={items.length}
			emptyMessage="お知らせはまだありません。"
			hasMore={hasMore}
			onLoadMore={loadMore}
		>
			<ul className="flex w-full flex-col gap-[30px]">
				{items.map((notice) => (
					<li
						key={notice.id}
						className="flex flex-col gap-6 after:h-px after:w-full after:bg-white"
					>
						<Link
							href={memberNoticeDetailPath(notice.id)}
							className="flex flex-col gap-1 transition-opacity hover:opacity-80"
						>
							<div className="flex flex-wrap items-center gap-2">
								<time className="text-[14px] leading-[22px] tracking-[1px]">
									{formatDate(notice.created_at)}
								</time>
								{!notice.is_read && <MemberTag tone="strong">未読</MemberTag>}
								{notice.category && <MemberTag>{notice.category}</MemberTag>}
							</div>
							<p
								className={`text-[18px] leading-[24px] tracking-[1px] break-all ${notice.is_read ? "opacity-80" : "font-medium"}`}
							>
								{notice.title}
							</p>
						</Link>
					</li>
				))}
			</ul>
		</PagedListStatus>
	);
}
