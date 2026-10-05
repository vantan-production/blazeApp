"use client";

import { formatDate } from "@/lib/members/format";
import {
	type Submission,
	submissionStatusLabel,
} from "@/lib/members/submissions";
import { MemberTag } from "../MemberTag";
import { PagedListStatus } from "../PagedListStatus";

type Props = {
	items: Submission[];
	loading: boolean;
	error: string | null;
	hasMore: boolean;
	onLoadMore: () => void;
};

/** 状態ごとの補足（何を待っているのか・どうなったのか） */
const statusNote: Record<Submission["status"], string> = {
	pending: "管理者の確認を待っています。",
	published: "ホームページのニュースに掲載されています。",
	draft: "今回は掲載が見送られました。",
};

/** 自分の投稿申請の一覧（GET /api/submissions の表示部分。取得は親の usePagedList で行う） */
export function SubmissionList({
	items,
	loading,
	error,
	hasMore,
	onLoadMore,
}: Props) {
	return (
		<PagedListStatus
			loading={loading}
			error={error}
			count={items.length}
			emptyMessage="まだ申請はありません。"
			hasMore={hasMore}
			onLoadMore={onLoadMore}
		>
			<ul className="flex w-full flex-col gap-[30px]">
				{items.map((submission) => (
					<li
						key={submission.id}
						className="flex flex-col gap-6 after:h-px after:w-full after:bg-white"
					>
						<div className="flex gap-3">
							{submission.img_url && (
								// biome-ignore lint/performance/noImgElement: S3の署名付きURLは期限付きで next/image の最適化対象にしない
								<img
									src={submission.img_url}
									alt=""
									className="aspect-[4/3] w-[96px] shrink-0 rounded-[8px] bg-white/20 object-cover"
								/>
							)}
							<div className="flex min-w-0 flex-1 flex-col gap-1">
								<div className="flex flex-wrap items-center gap-2">
									<time className="text-[14px] leading-[22px] tracking-[1px]">
										{formatDate(submission.created_at)}
									</time>
									<MemberTag
										tone={
											submission.status === "pending" ? "strong" : "default"
										}
									>
										{submissionStatusLabel[submission.status]}
									</MemberTag>
									{submission.category && (
										<MemberTag>{submission.category}</MemberTag>
									)}
								</div>
								<p className="text-[18px] leading-[24px] tracking-[1px] break-all">
									{submission.title}
								</p>
								<p className="line-clamp-2 text-[13px] leading-[20px] tracking-[0.5px] break-all opacity-80">
									{submission.body}
								</p>
								<p className="text-[12px] leading-[18px] tracking-[0.5px] opacity-70">
									{statusNote[submission.status]}
								</p>
							</div>
						</div>
					</li>
				))}
			</ul>
		</PagedListStatus>
	);
}
