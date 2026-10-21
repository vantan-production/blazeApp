import Image from "next/image";
import Link from "next/link";
import { adminTrialApplicationDetailPath } from "@/lib/admin/routes";
import {
	formatAppliedDate,
	formatDateWithWeekday,
	isPastTrialDate,
	schoolGradeOf,
	type TrialApplication,
} from "@/lib/admin/trialApplications";

type Props = {
	application: TrialApplication;
};

/**
 * 体験申し込み一覧の一行（問い合わせ一覧の行と同じ見た目）。タップで詳細へ。
 * 一覧には判断に必要な名前・体験希望日・学年・申込日だけを出し、連絡先などは詳細でだけ見せる
 */
export function TrialApplicationListItem({ application }: Props) {
	const grade = schoolGradeOf(application.birth_date);
	const past = isPastTrialDate(application.trial_date);

	return (
		<li>
			<Link
				href={adminTrialApplicationDetailPath(application.id)}
				className="flex min-h-20 w-full items-center gap-4 border border-brand-white px-3 py-2 transition-opacity hover:opacity-80"
			>
				<span className="flex min-w-0 flex-1 flex-col text-white">
					<span className="flex min-w-0 items-center gap-2">
						<span className="truncate text-[18px] leading-[22px] tracking-[1px] text-brand-white">
							{application.name}
						</span>
						{grade && (
							<span className="shrink-0 rounded-[200px] bg-white px-[10px] text-[12px] leading-[22px] tracking-[1px] text-brand-blue">
								{grade}
							</span>
						)}
					</span>
					<span className="truncate text-[12px] leading-[18px] tracking-[1px]">
						体験日 {formatDateWithWeekday(application.trial_date)}
						{past && "（過ぎています）"}
					</span>
					<span className="text-[12px] leading-[18px] tracking-[1px]">
						申込日{" "}
						<time dateTime={application.created_at}>
							{formatAppliedDate(application.created_at)}
						</time>
					</span>
				</span>
				<Image
					src="/icons/admin/chevron-right-white.svg"
					alt=""
					width={7.364}
					height={12.728}
				/>
			</Link>
		</li>
	);
}
