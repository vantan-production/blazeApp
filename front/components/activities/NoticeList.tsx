import Link from "next/link";
import { routes } from "@/lib/routes";
import type { Notice } from "./data";

type Props = {
	notices: Notice[];
};

/** 保護者の方への連絡事項（Figma: Frame 99 980:380） */
export function NoticeList({ notices }: Props) {
	return (
		<section className="flex w-full flex-col gap-5 p-[10px]">
			<h2 className="text-[22px] leading-[22px] tracking-[1.5px]">
				保護者の方への連絡事項
			</h2>
			<div className="flex flex-col items-end">
				<ul className="flex w-full flex-col">
					{notices.map((notice) => (
						<li key={notice.id} className="flex flex-col pb-5">
							<time className="p-[10px] text-[14px] leading-[22px] tracking-[1px]">
								{notice.date}
							</time>
							<p className="p-[10px] text-[16px] leading-[22px] tracking-[1.5px]">
								{notice.text}
							</p>
						</li>
					))}
				</ul>
				{/* TODO: 連絡事項の一覧ページができたら遷移先を差し替える */}
				<div className="px-5">
					<Link
						href={routes.news}
						className="block border-b-[1.5px] border-brand-white p-[10px] text-[16px] leading-[22px] tracking-[1.5px]"
					>
						もっと見る...
					</Link>
				</div>
			</div>
		</section>
	);
}
