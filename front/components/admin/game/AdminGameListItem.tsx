import Link from "next/link";
import { adminGameDetailPath } from "@/lib/admin/routes";
import { GameThumbnail } from "./GameThumbnail";

type Props = {
	id: string;
	/** 1枚目の画像のURL */
	thumbnailUrl: string | null;
	/** 投稿した画像の枚数 */
	imageCount: number;
	/** 掲載同意が未確認の枚数（0なら印を出さない） */
	pendingCount: number;
	/** 表示用の日付（YYYY/MM/DD） */
	date: string;
};

/** 投稿済み試合風景の一行。ニュース一覧と同じく、サムネイル＋日付＋白い区切り線。タイトルの代わりに枚数を出す。行全体が詳細画面へのリンク */
export function AdminGameListItem({
	id,
	thumbnailUrl,
	imageCount,
	pendingCount,
	date,
}: Props) {
	return (
		<li className="flex flex-col gap-6 after:h-px after:w-full after:bg-white">
			<Link
				href={adminGameDetailPath(id)}
				className="flex items-center gap-3 text-brand-white transition-opacity hover:opacity-80"
			>
				<GameThumbnail
					url={thumbnailUrl}
					className="aspect-[4/3] w-[96px] shrink-0 rounded-[8px]"
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
						{date}
					</time>
					<div className="flex min-w-0 flex-wrap items-center gap-1">
						<p className="text-[18px] leading-[22px] tracking-[1px]">
							画像 {imageCount}枚
						</p>
						{pendingCount > 0 && (
							// ニュースのカテゴリータグと同じ形
							<span className="shrink-0 rounded-[200px] bg-white px-[10px] text-[12px] leading-[22px] tracking-[1px] text-brand-blue">
								同意未確認 {pendingCount}枚
							</span>
						)}
					</div>
				</div>
			</Link>
		</li>
	);
}
