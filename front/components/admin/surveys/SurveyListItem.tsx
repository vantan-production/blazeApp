import Link from "next/link";
import { adminSurveyDetailPath } from "@/lib/admin/routes";
import { formatSurveyDate, type SurveySummary } from "@/lib/admin/surveys";
import { SurveyTags } from "./SurveyTags";

type Props = {
	survey: SurveySummary;
};

/** アンケート一覧の一行。ニュース一覧と同じく日付＋タイトル＋白い区切り線。行全体が詳細画面へのリンク */
export function SurveyListItem({ survey }: Props) {
	return (
		<li className="flex flex-col gap-6 after:h-px after:w-full after:bg-white">
			<Link
				href={adminSurveyDetailPath(survey.id)}
				className="flex flex-col gap-1 text-brand-white transition-opacity hover:opacity-80"
			>
				<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
					{formatSurveyDate(survey.created_at)} 作成
				</time>
				<p className="text-[18px] leading-[26px] tracking-[1px] break-all">
					{survey.title}
				</p>
				<SurveyTags survey={survey} />
				<p className="text-[12px] leading-[18px] tracking-[1px] opacity-80">
					作成: {survey.admin_name}
				</p>
			</Link>
		</li>
	);
}
