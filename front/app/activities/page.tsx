import type { Metadata } from "next";
import Link from "next/link";
import { ActivityOverview } from "@/components/activities/ActivityOverview";
import { BelongingsPanel } from "@/components/activities/BelongingsPanel";
import {
	activityGrade,
	activityPlace,
	activitySlots,
	belongings,
	notices,
} from "@/components/activities/data";
import { InquiryForm } from "@/components/activities/InquiryForm";
import { PageTabs } from "@/components/activities/PageTabs";
import { ScheduleCalendar } from "@/components/activities/ScheduleCalendar";
import { PageShell } from "@/components/layout/PageShell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { NewsListItem } from "@/components/ui/NewsListItem";
import { PillHeading } from "@/components/ui/PillHeading";
import { routes } from "@/lib/routes";

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

				<section className="flex w-full flex-col gap-4 px-6">
					<h2 className="px-[10px] pt-[10px] pb-5 text-center text-[22px] leading-[22px] tracking-[1.5px]">
						保護者の方への連絡事項
					</h2>
					<ul className="flex flex-col gap-4">
						{/* TODO: 連絡事項の詳細・一覧ページができたら遷移先を差し替える */}
						{notices.map((notice) => (
							<NewsListItem
								key={notice.id}
								href={routes.news}
								date={notice.date}
								title={notice.text}
							/>
						))}
					</ul>
					<Link
						href={routes.news}
						className="self-end border-b-[1.5px] border-brand-white px-1 text-[16px] leading-[22px] tracking-[1.5px]"
					>
						もっと見る
					</Link>
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
