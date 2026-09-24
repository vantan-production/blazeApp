import type { Metadata } from "next";
import { AboutPageTitle } from "@/components/about/AboutPageTitle";
import { AboutTabs } from "@/components/about/AboutTabs";
import { type Coach, CoachProfile } from "@/components/coaches/CoachProfile";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
	title: "コーチ紹介 | 西尾ブレイズ",
};

// TODO: 写真・本文はFigma上のサンプル。確定した内容に差し替える
const sampleText =
	"西尾市のクラブという意味の西尾と燃え盛る炎という意味のブレイズを合わせて、西尾の熱血的なチームとして輝けるようにと願いを込めたのが由来です。";

const coaches: Coach[] = [
	{
		name: "勝山 拓郎",
		photoSrc: "/images/coach-sample-1.png",
		comment: "全員で大会に向けて、切磋琢磨していきましょう！",
		policy: sampleText,
		hobby: sampleText,
	},
	{
		name: "花尾 智也",
		photoSrc: "/images/coach-sample-2.jpg",
		comment: "全国まで行けるチームになれるよう、話し合いながら成長していこう！",
		policy: sampleText,
		hobby: sampleText,
	},
];

/** 監督・コーチ紹介ページ（Figma: 監督コーチ紹介 1427:640） */
export default function CoachesPage() {
	return (
		<PageShell>
			<main className="flex flex-col items-center gap-8 pb-[111px]">
				<AboutTabs current="coaches" />
				<AboutPageTitle>コーチ紹介</AboutPageTitle>
				<div className="flex w-full max-w-[348px] flex-col gap-16">
					{coaches.map((coach) => (
						<CoachProfile key={coach.name} coach={coach} />
					))}
				</div>
			</main>
		</PageShell>
	);
}
