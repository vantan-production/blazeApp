"use client";

import { useState } from "react";
import { AdminPostForm } from "@/components/admin/AdminPostForm";
import { AdminTextField } from "@/components/admin/AdminTextField";
import type { Submission } from "@/lib/members/submissions";
import { VALIDATION_LIMITS } from "@/lib/validation/limits";
import { usePagedList } from "../usePagedList";
import { SubmissionList } from "./SubmissionList";

/**
 * 記事の投稿申請（POST /api/submissions）と自分の申請の一覧（GET /api/submissions）。
 * 申請はニュース記事（タイトル・本文・カテゴリー・画像1枚）として作られ、管理者が承認するとホームページに載る
 */
export function MemberSubmissions() {
	const [category, setCategory] = useState("");
	const list = usePagedList<Submission>(
		"/api/submissions",
		"申請の取得に失敗しました。",
	);

	return (
		<>
			<section
				aria-labelledby="submission-form"
				className="flex w-full flex-col gap-5"
			>
				<div className="flex flex-col gap-2 text-brand-white">
					<h2
						id="submission-form"
						className="text-[18px] leading-[22px] font-medium tracking-[1px]"
					>
						新しく申請する
					</h2>
					<p className="text-[13px] leading-[21px] tracking-[0.5px] opacity-90">
						試合や練習の様子を記事にして送れます。管理者が確認してから、ホームページのニュースに掲載されます。
					</p>
				</div>
				<AdminPostForm
					endpoint="/api/submissions"
					attachment={{
						name: "image",
						placeholder: "写真を選択（任意・1枚）",
						accept: "image/*",
					}}
					successMessage="申請を送りました。管理者の承認をお待ちください。"
					extraFields={
						<AdminTextField
							tone="dark"
							label="カテゴリー（任意）"
							placeholder="例: 試合結果"
							value={category}
							maxLength={VALIDATION_LIMITS.category.max}
							onChange={(event) => setCategory(event.target.value)}
						/>
					}
					extraValues={{ category: category.trim() || undefined }}
					submitGap="sm"
					onSuccess={() => {
						setCategory("");
						list.reload();
					}}
				/>
			</section>
			<section
				aria-labelledby="submission-history"
				className="flex w-full flex-col gap-5"
			>
				<h2
					id="submission-history"
					className="text-[18px] leading-[22px] font-medium tracking-[1px] text-brand-white"
				>
					これまでの申請
				</h2>
				<SubmissionList
					items={list.items}
					loading={list.loading}
					error={list.error}
					hasMore={list.hasMore}
					onLoadMore={list.loadMore}
				/>
			</section>
		</>
	);
}
