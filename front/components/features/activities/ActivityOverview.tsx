import Image from "next/image";
import { ContentPanel } from "@/components/ui/ContentPanel";
import type { ActivitySlot } from "./data";

type Props = {
	grade: string;
	slots: ActivitySlot[];
	place: { name: string; links: { label: string; href: string }[] };
};

/** 曜日を黄色のピルで示す小ラベル */
function DayChip({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex shrink-0 items-center justify-center rounded-[1000px] bg-brand-yellow px-3 text-[14px] leading-[26px] font-medium tracking-[1px] whitespace-nowrap">
			{children}
		</span>
	);
}

/** 対象学年・活動日時・活動場所を白パネルで並べる活動概要 */
export function ActivityOverview({ grade, slots, place }: Props) {
	return (
		<div className="flex w-full flex-col gap-6">
			<ContentPanel title="対象学年" titleAs="h2" align="center">
				<p className="text-[20px] font-medium">{grade}</p>
			</ContentPanel>

			<ContentPanel title="活動日時" titleAs="h2">
				<ul className="flex flex-col">
					{slots.map((slot, i) => (
						<li
							key={slot.label}
							className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-3 ${
								i > 0 ? "border-t border-brand-blue/20" : ""
							}`}
						>
							<DayChip>{slot.label}</DayChip>
							<span className="text-[20px] font-medium tracking-[1px]">
								{slot.time}
							</span>
						</li>
					))}
				</ul>
			</ContentPanel>

			<ContentPanel
				id="access"
				title="主な活動場所"
				titleAs="h2"
				align="center"
			>
				<div className="flex flex-col items-center gap-4">
					<p className="text-[20px] font-medium">{place.name}</p>
					<ul className="flex w-full flex-col gap-2">
						{place.links.map((link) => (
							<li key={link.label}>
								<a
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									className="flex h-11 w-full items-center justify-center gap-2 rounded-[1000px] border-2 border-brand-blue text-[16px] tracking-[1px]"
								>
									{link.label}
									<Image
										src="/icons/external-link.svg"
										alt=""
										width={20}
										height={20}
									/>
								</a>
							</li>
						))}
					</ul>
				</div>
			</ContentPanel>
		</div>
	);
}
