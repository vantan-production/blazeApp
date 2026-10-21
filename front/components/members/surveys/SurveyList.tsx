"use client";

import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/members/format";
import { memberSurveyDetailPath } from "@/lib/members/routes";
import type { Survey } from "@/lib/members/surveys";
import { MemberTag } from "../MemberTag";
import { PagedListStatus } from "../PagedListStatus";
import { usePagedList } from "../usePagedList";

/** 回答状況のタグ。受付中で未回答のものだけ目立たせる */
function SurveyStateTag({ survey }: { survey: Survey }) {
	if (survey.has_responded) return <MemberTag>回答済み</MemberTag>;
	if (survey.is_closed) return <MemberTag>締切</MemberTag>;
	return <MemberTag tone="strong">未回答</MemberTag>;
}

/** アンケート・出欠確認の一覧（GET /api/surveys。自分の回答状況付き・10件ずつ追加読み込み） */
export function SurveyList() {
	const { items, loading, error, hasMore, loadMore } = usePagedList<Survey>(
		"/api/surveys",
		"アンケートの取得に失敗しました。",
	);

	return (
		<PagedListStatus
			loading={loading}
			error={error}
			count={items.length}
			emptyMessage="アンケートはまだありません。"
			hasMore={hasMore}
			onLoadMore={loadMore}
		>
			<ul className="flex w-full flex-col gap-[30px]">
				{items.map((survey) => (
					<li
						key={survey.id}
						className="flex flex-col gap-6 after:h-px after:w-full after:bg-white"
					>
						<Link
							href={memberSurveyDetailPath(survey.id)}
							className="flex flex-col gap-1 transition-opacity hover:opacity-80"
						>
							<div className="flex flex-wrap items-center gap-2">
								<time className="text-[14px] leading-[22px] tracking-[1px]">
									{formatDate(survey.created_at)}
								</time>
								<SurveyStateTag survey={survey} />
							</div>
							<p className="text-[18px] leading-[24px] tracking-[1px] break-all">
								{survey.title}
							</p>
							{survey.closes_at && (
								<p className="text-[12px] leading-[18px] tracking-[1px] opacity-80">
									締切: {formatDateTime(survey.closes_at)}
								</p>
							)}
						</Link>
					</li>
				))}
			</ul>
		</PagedListStatus>
	);
}
