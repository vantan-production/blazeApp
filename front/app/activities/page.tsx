import type { Metadata } from "next";
import { ActivityOverview } from "@/components/features/activities/ActivityOverview";
import { BelongingsPanel } from "@/components/features/activities/BelongingsPanel";
import {
	activityGrade,
	activityPlace,
	activitySlots,
	belongings,
} from "@/components/features/activities/data";
import { InquiryForm } from "@/components/features/activities/InquiryForm";
import { PageTabs } from "@/components/features/activities/PageTabs";
import { ScheduleCalendar } from "@/components/features/activities/ScheduleCalendar";
import { PageShell } from "@/components/layout/PageShell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PillHeading } from "@/components/ui/PillHeading";

export const metadata: Metadata = {
	title: "活動内容・スケジュール | 西尾ブレイズ",
};

/**
 * 活動内容・スケジュールページ（Figma: 活動内容 978:282）。
 * トップページと同じ黄色のピル見出し・白パネル・お知らせ行のデザインで組んでいる。
 */
export default function ActivitiesPage() {
	return (
		<PageShell>
			<main className="flex w-full flex-col items-center gap-12 pb-10">
				<PageTabs
					current={{
						label: (
							<>
								活動内容、
								<br />
								スケジュール
							</>
						),
						href: "#activities",
					}}
					other={{ label: "お問い合わせ", href: "#inquiry" }}
				/>

				<section
					id="activities"
					className="flex w-full scroll-mt-[96px] flex-col items-center gap-8 px-6"
				>
					<PillHeading as="h1">活動内容</PillHeading>
					<ActivityOverview
						grade={activityGrade}
						slots={activitySlots}
						place={activityPlace}
					/>
				</section>

				<section className="flex w-full flex-col items-center gap-8 px-6">
					<PillHeading>スケジュール</PillHeading>
					<ScheduleCalendar />
				</section>

				<section className="w-full px-6">
					<BelongingsPanel items={belongings} />
				</section>

				<section
					id="inquiry"
					className="flex w-full scroll-mt-[96px] flex-col items-center gap-8"
				>
					<PillHeading>お問い合わせ</PillHeading>
					<InquiryForm />
				</section>
			</main>
			<SiteFooter />
		</PageShell>
	);
}
