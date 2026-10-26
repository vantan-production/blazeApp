import Image from "next/image";
import { TrialBanner } from "@/components/ui/TrialBanner";

/** キャッチコピーの共通スタイル（Figma: h1 bold + ドロップシャドウ、-17.94deg 回転） */
const catchLineClass =
	"block -rotate-[17.94deg] text-[5.97cqw] leading-[5.47cqw] font-medium tracking-[1px] whitespace-nowrap text-shadow-[2px_4px_5px_rgba(0,0,0,0.45)]";

/** ヘッダーがスクロール位置の判定に使うファーストビューのid */
export const HERO_SECTION_ID = "top-hero";

/**
 * トップページのファーストビュー（Figma: fast-view 978:352）。
 * 選手写真と体育館写真（Vector 2）を重ね、斜めのキャッチコピーを載せる。
 * 画像群は402px幅より広いため、左右はみ出た分を切り抜く。
 * 寸法はFigmaの402px幅を基準に cqw（このセクション幅に対する%）へ換算し、スマホ幅に比例して伸縮させる。
 * ファーストビューは画面より縦に長いため、体験バナーは開いた直後の画面下端に重ね、最初から見えるようにする。
 */
export function HeroSection() {
	return (
		<section
			id={HERO_SECTION_ID}
			className="@container relative flex w-full justify-center overflow-hidden"
		>
			<div className="grid shrink-0 place-items-start">
				{/* 選手写真（円陣を組む選手たち）。横長の写真を縦長の枠に合わせて中央を切り抜く */}
				<div className="relative col-start-1 row-start-1 h-[156.48cqw] w-[119.45cqw]">
					<Image
						src="/images/blaze-circle.JPG"
						alt="円陣を組む選手たち"
						fill
						sizes="120vw"
						preload
						className="object-cover"
					/>
				</div>
				{/* 体育館の写真（Vector 2）。上辺が斜めに切り抜かれた画像を左右反転して重ねる */}
				<div className="relative col-start-1 row-start-1 mt-[100.26cqw] ml-[0.59cqw] h-[117.1cqw] w-[119.05cqw] -scale-x-100">
					<Image
						src="/images/top-hero-overlay.png"
						alt="大会で整列する選手たち"
						fill
						sizes="120vw"
						className="object-fill"
					/>
				</div>
			</div>

			<h1 className="absolute top-[106.97cqw] left-1/2 flex h-[29.6cqw] w-[60.7cqw] -translate-x-1/2 flex-col items-center text-brand-white">
				<span className="flex h-[18.54cqw] items-center justify-center">
					<span className={catchLineClass}>ドッジボールを</span>
				</span>
				<span className="-mt-[13.32cqw] flex h-[24.29cqw] items-center justify-center">
					<span className={catchLineClass}>みんなで楽しもう！！</span>
				</span>
			</h1>

			{/* 開いた直後の画面下端（バナー高さ44px＋余白16px）に置く。画面がファーストビューより高いときはファーストビューの下端に合わせる */}
			<div className="absolute inset-x-[10px] top-[min(calc(100svh_-_60px),calc(100%_-_60px))]">
				<TrialBanner />
			</div>
		</section>
	);
}
