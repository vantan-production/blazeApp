import type { Metadata } from "next";
import { ActivityOverview } from "@/components/features/activities/ActivityOverview";
import { BelongingsPanel } from "@/components/features/activities/BelongingsPanel";
import {
	activityGrade,
	activityPlaces,
	activitySlots,
	belongings,
} from "@/components/features/activities/data";
import { InquiryForm } from "@/components/features/activities/InquiryForm";
import { PageTabs } from "@/components/features/activities/PageTabs";
import { ScheduleCalendar } from "@/components/features/activities/ScheduleCalendar";
import { PageShell } from "@/components/layout/PageShell";
import { ContentPanel } from "@/components/ui/ContentPanel";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { fetchScheduleEvents } from "@/lib/schedule";

export const metadata: Metadata = {
	title: "活動内容・スケジュール | 西尾ブレイズ",
};

/**
 * 活動内容・スケジュールページ（Figma: 活動内容 978:282）。
 * 見出しは他ページと同じく、ページタイトル（h1）→ 大見出し（h2）→ 白パネルの黄色ラベル（h3）の3段で組む。
 */
export default async function ActivitiesPage() {
	const events = await fetchScheduleEvents();

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
					className="flex w-full scroll-mt-[96px] flex-col gap-6"
				>
					<PageTitle>活動内容</PageTitle>
					<div className="flex w-full flex-col items-center px-6">
						<ActivityOverview
							grade={activityGrade}
							slots={activitySlots}
							places={activityPlaces}
						/>
					</div>
				</section>

				<section className="flex w-full flex-col items-center gap-8 px-6">
					<SectionHeading>スケジュール</SectionHeading>
					<ScheduleCalendar events={events} />
				</section>

				<section className="w-full px-6">
					<BelongingsPanel items={belongings} />
				</section>

				<section
					id="inquiry"
					className="flex w-full scroll-mt-[96px] flex-col items-center gap-8 px-6"
				>
					<SectionHeading>お問い合わせ</SectionHeading>
					<ContentPanel>
						<InquiryForm />
					</ContentPanel>
				</section>
			</main>
		</PageShell>
	);
}
