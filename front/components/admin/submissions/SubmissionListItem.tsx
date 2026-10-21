"use client";

import { useState } from "react";
import {
	formatSubmissionDate,
	type Submission,
	type SubmissionDecision,
} from "@/lib/admin/submissions";

type Props = {
	submission: Submission;
	/** 承認・差し戻しのボタンを押したとき（確認ダイアログは一覧側で出す） */
	onDecide: (decision: SubmissionDecision) => void;
};

// これより長い本文は最初の数行だけ出し、「全文を表示」で開く
const LONG_BODY_LENGTH = 120;

/**
 * 投稿申請1件。公開されたときと同じ中身（画像・分類・タイトル・本文）を確認できるよう並べ、
 * 下に「承認して公開」「差し戻す」を置く
 */
export function SubmissionListItem({ submission, onDecide }: Props) {
	const [expanded, setExpanded] = useState(false);
	const isLong =
		submission.body.length > LONG_BODY_LENGTH ||
		submission.body.split("\n").length > 4;

	return (
		<li className="flex flex-col gap-3 after:h-px after:w-full after:bg-white">
			<div className="flex flex-col gap-1">
				<p className="text-[14px] leading-[22px] tracking-[1px] break-all">
					申請者: {submission.admin_name}
				</p>
				<time className="text-[12px] leading-[18px] tracking-[1px] opacity-80">
					{formatSubmissionDate(submission.created_at)} に申請
				</time>
			</div>
			{/* 公開されたときの記事の中身 */}
			<article className="flex flex-col gap-3 rounded-[14px] bg-white/10 p-3">
				{submission.img_url ? (
					<a
						href={submission.img_url}
						target="_blank"
						rel="noopener noreferrer"
						aria-label="添付画像を大きく開く"
						className="block transition-opacity hover:opacity-90"
					>
						{/* biome-ignore lint/performance/noImgElement: S3の署名付きURLは毎回変わり、ホストもnext.configに登録していないためnext/imageを使わない */}
						<img
							src={submission.img_url}
							alt=""
							className="aspect-[4/3] w-full rounded-[10px] bg-white/20 object-cover"
						/>
					</a>
				) : (
					<p className="text-[12px] leading-[18px] tracking-[1px] opacity-70">
						画像なし
					</p>
				)}
				{submission.category && (
					// ニュースのカテゴリータグと同じ形
					<span className="self-start rounded-[200px] bg-white px-[10px] text-[12px] leading-[22px] tracking-[1px] text-brand-blue">
						{submission.category}
					</span>
				)}
				<h2 className="text-[18px] leading-[24px] font-medium tracking-[1px] break-all">
					{submission.title}
				</h2>
				<p
					className={`text-[14px] leading-[22px] tracking-[0.5px] whitespace-pre-wrap break-all ${isLong && !expanded ? "line-clamp-4" : ""}`}
				>
					{submission.body}
				</p>
				{isLong && (
					<button
						type="button"
						onClick={() => setExpanded((prev) => !prev)}
						aria-expanded={expanded}
						className="self-start text-[13px] leading-[20px] tracking-[1px] underline"
					>
						{expanded ? "閉じる" : "全文を表示"}
					</button>
				)}
			</article>
			<div className="flex gap-2 pb-3">
				<button
					type="button"
					onClick={() => onDecide("approve")}
					className="flex h-8 items-center rounded-full bg-brand-white px-4 text-[14px] leading-[22px] tracking-[1px] text-brand-blue shadow-[0px_2px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-80"
				>
					承認して公開
				</button>
				<button
					type="button"
					onClick={() => onDecide("reject")}
					className="flex h-8 items-center rounded-full bg-brand-blue px-4 text-[14px] leading-[22px] tracking-[1px] text-brand-white shadow-[0px_2px_4px_rgba(0,0,0,0.25)] ring-1 ring-white/60 transition-opacity hover:opacity-80"
				>
					差し戻す
				</button>
			</div>
		</li>
	);
}
