import Link from "next/link";
import { adminMediaDetailPath } from "@/lib/admin/routes";
import { MediaThumbnail } from "./MediaThumbnail";

type Props = {
	id: string;
	/** サムネイル画像のURL（未設定の投稿もある） */
	thumbnailUrl: string | null;
	/** 表示用の日付（YYYY/MM/DD） */
	date: string;
	title: string;
};

/** 投稿済みメディア情報の一行。ニュース一覧と同じく、サムネイル＋日付＋タイトル＋白い区切り線。行全体が詳細画面へのリンク */
export function AdminMediaListItem({ id, thumbnailUrl, date, title }: Props) {
	return (
		<li className="flex flex-col gap-6 after:h-px after:w-full after:bg-white">
			<Link
				href={adminMediaDetailPath(id)}
				className="flex items-center gap-3 text-brand-white transition-opacity hover:opacity-80"
			>
				<MediaThumbnail
					url={thumbnailUrl}
					className="aspect-[4/3] w-[96px] shrink-0 rounded-[8px]"
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
						{date}
					</time>
					<p className="line-clamp-2 text-[18px] leading-[22px] tracking-[1px] break-all">
						{title}
					</p>
				</div>
			</Link>
		</li>
	);
}
