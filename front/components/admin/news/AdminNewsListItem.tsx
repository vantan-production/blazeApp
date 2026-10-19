import Link from "next/link";
import { type NoticeStatus, noticeStatusLabel } from "@/lib/admin/notices";
import { adminNewsDetailPath } from "@/lib/admin/routes";
import { NewsCategoryTag } from "./NewsCategoryTag";
import { NewsThumbnail } from "./NewsThumbnail";

type Props = {
	id: string;
	/** サムネイル画像のURL（未設定の投稿もある） */
	thumbnailUrl: string | null;
	/** カテゴリー（未設定の投稿もある） */
	category: string | null;
	/** 公開状態。公開中以外のときだけ「承認待ち」などのタグを出す */
	status: NoticeStatus;
	/** 表示用の日付（YYYY/MM/DD） */
	date: string;
	title: string;
};

/**
 * 投稿済みお知らせの一行（Figma: Frame 155 1700:373）。サムネイル＋カテゴリータグ＋日付＋タイトル＋白い区切り線。
 * 行全体が詳細画面へのリンク
 */
export function AdminNewsListItem({
	id,
	thumbnailUrl,
	category,
	status,
	date,
	title,
}: Props) {
	return (
		<li className="flex flex-col gap-6 after:h-px after:w-full after:bg-white">
			<Link
				href={adminNewsDetailPath(id)}
				className="flex items-center gap-3 text-brand-white transition-opacity hover:opacity-80"
			>
				<NewsThumbnail
					url={thumbnailUrl}
					className="aspect-[4/3] w-[96px] shrink-0 rounded-[8px]"
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex min-w-0 items-center gap-1">
						{status !== "published" && (
							<span className="shrink-0 rounded-[200px] bg-[#ffe7a3] px-[10px] text-[12px] leading-[22px] tracking-[1px] text-[#7a5200]">
								{noticeStatusLabel[status] ?? status}
							</span>
						)}
						{category && <NewsCategoryTag>{category}</NewsCategoryTag>}
						<time className="shrink-0 px-[2px] text-[14px] leading-[22px] tracking-[1px]">
							{date}
						</time>
					</div>
					<p className="line-clamp-2 text-[18px] leading-[22px] tracking-[1px] break-all">
						{title}
					</p>
				</div>
			</Link>
		</li>
	);
}
