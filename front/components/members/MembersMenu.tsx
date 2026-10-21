"use client";

import { useEffect, useState } from "react";
import { memberApi } from "@/lib/members/api";
import type { Notice } from "@/lib/members/notices";
import { memberRoutes } from "@/lib/members/routes";
import type { Survey } from "@/lib/members/surveys";
import { MembersMenuCard } from "./MembersMenuCard";

/** 件数を数えるために読む最大ページ数（1ページ10件）。これを超える分は「○件以上」と出す */
const MAX_COUNT_PAGES = 5;

type Count = { count: number; more: boolean };

/**
 * 一覧APIを先頭から読み、条件に合う件数を数える。
 * 未読数・未回答数を返す API が無いため、一覧（自分の既読・回答状況付き）を数えて出す。
 */
const countMatching = async <T,>(
	endpoint: string,
	matches: (item: T) => boolean,
): Promise<Count> => {
	let count = 0;
	for (let page = 1; page <= MAX_COUNT_PAGES; page++) {
		const res = await memberApi<T[]>(endpoint, { params: { page } });
		count += res.data.filter(matches).length;
		const totalPages = res.pagination?.totalPages ?? 1;
		if (page >= totalPages) return { count, more: false };
	}
	return { count, more: true };
};

const toBadge = (label: string, value: Count | null) =>
	value && value.count > 0
		? `${label}${value.count}${value.more ? "+" : ""}`
		: null;

/** 24px の線アイコン */
function LineIcon({ d }: { d: string }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
			className="size-6"
		>
			<path d={d} />
		</svg>
	);
}

const icons = {
	// ベル
	notices:
		"M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
	// チェックリスト
	surveys:
		"M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
	// 写真
	gallery:
		"M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M21 15l-5-5L5 21",
	// 書類
	documents:
		"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
	// 送信
	submissions: "M22 2L11 13M22 2l-7 20-4-9-9-4z",
} as const;

/**
 * 関係者ページTOPのメニュー。
 * お知らせの未読数（GET /api/notices の is_read）とアンケートの未回答数（GET /api/surveys の
 * is_closed / has_responded）を数えて印を出す。数えられなかったときは印を出さないだけにする。
 */
export function MembersMenu() {
	const [unreadNotices, setUnreadNotices] = useState<Count | null>(null);
	const [pendingSurveys, setPendingSurveys] = useState<Count | null>(null);

	useEffect(() => {
		let current = true;
		countMatching<Notice>("/api/notices", (notice) => !notice.is_read)
			.then((value) => {
				if (current) setUnreadNotices(value);
			})
			.catch(() => {});
		countMatching<Survey>(
			"/api/surveys",
			(survey) => !survey.is_closed && !survey.has_responded,
		)
			.then((value) => {
				if (current) setPendingSurveys(value);
			})
			.catch(() => {});
		return () => {
			current = false;
		};
	}, []);

	const items = [
		{
			label: "お知らせ",
			href: memberRoutes.notices,
			icon: <LineIcon d={icons.notices} />,
			badge: toBadge("未読", unreadNotices),
		},
		{
			label: "アンケート・出欠",
			href: memberRoutes.surveys,
			icon: <LineIcon d={icons.surveys} />,
			badge: toBadge("未回答", pendingSurveys),
		},
		{
			label: "試合写真",
			href: memberRoutes.gallery,
			icon: <LineIcon d={icons.gallery} />,
		},
		{
			label: "資料",
			href: memberRoutes.documents,
			icon: <LineIcon d={icons.documents} />,
		},
		{
			label: "記事の投稿申請",
			href: memberRoutes.submissions,
			icon: <LineIcon d={icons.submissions} />,
		},
	];

	return (
		<nav aria-label="関係者メニュー" className="w-full">
			<ul className="flex flex-col gap-5">
				{items.map((item) => (
					<li key={item.href}>
						<MembersMenuCard {...item} />
					</li>
				))}
			</ul>
		</nav>
	);
}
