import {
	type Notice,
	noticeStatusLabel,
	noticeVisibilityLabel,
} from "@/lib/admin/notices";

type Props = {
	notice: Pick<Notice, "visibility" | "status" | "category">;
};

/** ニュースのカテゴリータグと同じ形の白いタグ */
const tagClass =
	"shrink-0 rounded-[200px] px-[10px] text-[12px] leading-[22px] tracking-[1px]";

/**
 * お知らせのタグ（公開範囲・公開状態・カテゴリー）。
 * 公開範囲は「関係者限定」と分かるように常に出し、公開中以外（承認待ち・下書き）のときだけ状態も出す
 */
export function NoticeTags({ notice }: Props) {
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-1">
			<span className={`${tagClass} bg-brand-yellow text-brand-blue`}>
				{noticeVisibilityLabel[notice.visibility] ?? notice.visibility}
			</span>
			{notice.status !== "published" && (
				<span className={`${tagClass} bg-[#ffe7a3] text-[#7a5200]`}>
					{noticeStatusLabel[notice.status] ?? notice.status}
				</span>
			)}
			{notice.category && (
				<span className={`${tagClass} bg-white text-brand-blue`}>
					{notice.category}
				</span>
			)}
		</div>
	);
}
