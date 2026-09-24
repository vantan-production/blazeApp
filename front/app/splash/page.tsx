import type { Metadata } from "next";
import { SplashScreen } from "@/components/splash/SplashScreen";

export const metadata: Metadata = {
	title: "スプラッシュ画面（確認用） | 西尾ブレイズ",
	robots: { index: false },
};

/** スプラッシュ画面を単体で確認するためのページ */
export default function SplashPreviewPage() {
	return (
		<main className="flex flex-1 flex-col items-center justify-center gap-4 text-brand-white">
			<SplashScreen oncePerSession={false} />
			<p>スプラッシュ画面の確認用ページです</p>
			{/* 同じURLでもコンポーネントを作り直すため、Linkではなく再読み込みにする */}
			<a href="/splash" className="underline">
				もう一度表示する
			</a>
		</main>
	);
}
