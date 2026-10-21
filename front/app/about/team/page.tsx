import type { Metadata } from "next";
import Image from "next/image";
import { AboutPageTitle } from "@/components/about/AboutPageTitle";
import { AboutTabs } from "@/components/about/AboutTabs";
import { PageShell } from "@/components/layout/PageShell";
import { ContentPanel } from "@/components/ui/ContentPanel";

export const metadata: Metadata = {
	title: "チーム紹介 | 西尾ブレイズ",
};

type TeamSection = { title: string; body: string };

// TODO: 本文はFigma上のダミーテキスト。確定した文章に差し替える
const originText =
	"西尾市のクラブという意味の西尾と燃え盛る炎という意味のブレイズを合わせて、西尾の熱血的なチームとして輝けるようにと願いを込めたのが由来です。";

/** 写真バナーより上に並ぶ項目 */
const upperSections: TeamSection[] = [
	{ title: "チーム名の由来", body: originText },
	{ title: "設立年と目的", body: "サンプルテキストです。サンプルテキスト" },
	{ title: "設立ストーリー", body: originText },
	{ title: "活動理念", body: originText },
	{ title: "対象年齢と所属区域", body: originText },
];

/** 写真バナーより下に並ぶ項目 */
const lowerSections: TeamSection[] = [
	{ title: "プレースタイル", body: originText },
	{ title: "チームの雰囲気", body: originText },
	{ title: "ユニフォーム紹介", body: originText },
];

/** チーム紹介ページ（Figma: チーム紹介 874:532） */
export default function TeamPage() {
	return (
		<PageShell>
			<main className="flex flex-col items-center gap-6 pb-[111px]">
				<AboutTabs current="team" />
				<AboutPageTitle>チーム紹介</AboutPageTitle>
				{/* 402px幅で左右27px（パネル幅348px）。狭い画面では余白も少し縮める */}
				<div className="flex w-full max-w-[402px] flex-col items-center gap-10 px-[clamp(16px,6.7vw,27px)]">
					{upperSections.map((section) => (
						<TeamSectionPanel key={section.title} section={section} />
					))}
					{/* パネル列の幅を超えて画面幅いっぱいに敷く写真 */}
					<div className="relative h-[210px] w-screen max-w-sp shrink-0">
						<Image
							src="/images/team-banner.png"
							alt=""
							fill
							sizes="(max-width: 430px) 100vw, 430px"
							className="object-cover opacity-30"
						/>
					</div>
					{lowerSections.map((section) => (
						<TeamSectionPanel key={section.title} section={section} />
					))}
				</div>
			</main>
		</PageShell>
	);
}

function TeamSectionPanel({ section }: { section: TeamSection }) {
	return (
		<ContentPanel title={section.title}>
			<p className="text-center">{section.body}</p>
		</ContentPanel>
	);
}
