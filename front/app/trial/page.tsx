import type { Metadata } from "next";
import { Copyright } from "@/components/layout/Copyright";
import { PageShell } from "@/components/layout/PageShell";
import { TrialForm } from "@/components/trial/TrialForm";
import { ContentPanel } from "@/components/ui/ContentPanel";
import { PillHeading } from "@/components/ui/PillHeading";

export const metadata: Metadata = {
	title: "ドッジボール体験 | 西尾ブレイズ",
};

/** ドッジボール体験の申し込みページ（Figma注記「体験フォームページが必要」に基づく仮デザイン） */
export default function TrialPage() {
	return (
		<PageShell>
			<main className="flex flex-col items-center gap-8 px-6 pt-6 pb-10">
				<PillHeading as="h1">ドッジボール体験</PillHeading>
				<ContentPanel title="体験について" titleAs="h2" align="center">
					<p>
						小学1〜6年生のお子さまを対象に、無料で練習に参加できます。
						<br />
						動きやすい服装・水筒・上履きをご用意ください。
					</p>
				</ContentPanel>
				<ContentPanel title="お申し込み" titleAs="h2">
					<TrialForm />
				</ContentPanel>
				<Copyright />
			</main>
		</PageShell>
	);
}
