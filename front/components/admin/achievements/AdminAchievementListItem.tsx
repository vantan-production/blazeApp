import Link from "next/link";
import { adminAchievementDetailPath } from "@/lib/admin/routes";
import { AchievementThumbnail } from "./AchievementThumbnail";

type Props = {
	id: string;
	/** 添付画像のURL（画像を添付していない投稿もある） */
	thumbnailUrl: string | null;
	/** 動画・ファイルを添付しているか（一覧で分かるよう日付の横に印を出す） */
	hasMovie: boolean;
	hasFile: boolean;
	/** 表示用の日付（YYYY/MM/DD） */
	date: string;
	title: string;
};

/** 投稿済み実績の一行。ニュース一覧と同じく、サムネイル＋日付＋タイトル＋白い区切り線。行全体が詳細画面へのリンク */
export function AdminAchievementListItem({
	id,
	thumbnailUrl,
	hasMovie,
	hasFile,
	date,
	title,
}: Props) {
	return (
		<li className="flex flex-col gap-6 after:h-px after:w-full after:bg-white">
			<Link
				href={adminAchievementDetailPath(id)}
				className="flex items-center gap-3 text-brand-white transition-opacity hover:opacity-80"
			>
				<AchievementThumbnail
					url={thumbnailUrl}
					className="aspect-[4/3] w-[96px] shrink-0 rounded-[8px]"
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex min-w-0 items-center gap-1">
						<time className="shrink-0 px-[2px] text-[14px] leading-[22px] tracking-[1px]">
							{date}
						</time>
						{hasMovie && <AttachmentMark>動画</AttachmentMark>}
						{hasFile && <AttachmentMark>ファイル</AttachmentMark>}
					</div>
					<p className="line-clamp-2 text-[18px] leading-[22px] tracking-[1px] break-all">
						{title}
					</p>
				</div>
			</Link>
		</li>
	);
}

/** 添付の種類を示す小さな印（ニュースのカテゴリータグと同じ形） */
function AttachmentMark({ children }: { children: React.ReactNode }) {
	return (
		<span className="shrink-0 rounded-[200px] bg-white px-[10px] text-[12px] leading-[22px] tracking-[1px] text-brand-blue">
			{children}
		</span>
	);
}
