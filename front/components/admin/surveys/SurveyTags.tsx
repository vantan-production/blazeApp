import { formatSurveyDateTime, type SurveySummary } from "@/lib/admin/surveys";

type Props = {
	survey: Pick<SurveySummary, "is_closed" | "closes_at" | "allow_multiple">;
};

/** ニュースのカテゴリータグと同じ形 */
const tagClass =
	"shrink-0 rounded-[200px] px-[10px] text-[12px] leading-[22px] tracking-[1px]";

/**
 * アンケートの状態・締切・選び方のタグ。
 * 受付中: 緑 / 締切済み: グレー。締切と「1つだけ選ぶ／複数選べる」は白いタグで出す
 */
export function SurveyTags({ survey }: Props) {
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-1">
			{survey.is_closed ? (
				<span className={`${tagClass} bg-[#d9d9d9] text-[#505050]`}>
					締切済み
				</span>
			) : (
				<span className={`${tagClass} bg-[#d1f0ae] text-[#1f6b00]`}>
					受付中
				</span>
			)}
			<span className={`${tagClass} bg-white text-brand-blue`}>
				{survey.closes_at
					? `締切 ${formatSurveyDateTime(survey.closes_at)}`
					: "締切なし"}
			</span>
			<span className={`${tagClass} bg-white text-brand-blue`}>
				{survey.allow_multiple ? "複数選べる" : "1つだけ選ぶ"}
			</span>
		</div>
	);
}
