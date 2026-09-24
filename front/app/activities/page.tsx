import type { Metadata } from "next";
import { Belongings } from "@/components/activities/Belongings";
import {
	activityPlace,
	activitySlots,
	belongings,
	notices,
} from "@/components/activities/data";
import { InfoSection } from "@/components/activities/InfoSection";
import { InquiryForm } from "@/components/activities/InquiryForm";
import { NoticeList } from "@/components/activities/NoticeList";
import { PageTabs } from "@/components/activities/PageTabs";
import { Schedule } from "@/components/activities/Schedule";
import { PageShell } from "@/components/layout/PageShell";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
	title: "活動内容・スケジュール | 西尾ブレイズ",
};

/** 活動内容・スケジュールページ（Figma: 活動内容 978:282） */
export default function ActivitiesPage() {
	return (
		<PageShell>
			<main className="flex w-full flex-col items-center gap-6">
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
				<h1
					id="activities"
					className="scroll-mt-[96px] px-[10px] py-[30px] text-[24px] leading-[22px] font-medium tracking-[1px]"
				>
					活動内容、スケジュール
				</h1>
				<div className="flex w-full flex-col gap-5">
					<InfoSection title="対象学年">
						<p className="p-5">小学1年生〜小学6年生</p>
					</InfoSection>
					<InfoSection title="活動日時">
						<ul className="flex flex-col px-5 pb-[10px]">
							{activitySlots.map((slot) => (
								<li key={slot.label} className="py-[10px]">
									{slot.label}：{slot.time}
								</li>
							))}
						</ul>
					</InfoSection>
					<InfoSection title="活動場所">
						<div className="flex flex-col gap-[10px] px-[10px]">
							<p className="p-[10px]">{activityPlace.name}</p>
							<ul className="flex flex-col">
								{activityPlace.links.map((link) => (
									<li key={link.label}>
										<a
											href={link.href}
											target="_blank"
											rel="noopener noreferrer"
											className="block p-[10px] break-all"
										>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>
					</InfoSection>
				</div>
				<Schedule />
				<div className="flex w-full flex-col gap-4">
					<InfoSection title="持ち物">
						<Belongings items={belongings} />
					</InfoSection>
					<NoticeList notices={notices} />
				</div>
				<section
					id="inquiry"
					aria-labelledby="inquiry-heading"
					className="flex w-full scroll-mt-[96px] flex-col items-center gap-8 pt-[28px]"
				>
					<h2
						id="inquiry-heading"
						className="px-[10px] py-[30px] text-[22px] leading-[22px] font-medium tracking-[1px]"
					>
						お問い合わせ
					</h2>
					<InquiryForm />
				</section>
			</main>
			<SiteFooter />
		</PageShell>
	);
}
