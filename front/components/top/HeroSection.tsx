import Image from "next/image";

/** キャッチコピーの共通スタイル（Figma: h1 bold + ドロップシャドウ、-17.94deg 回転） */
const catchLineClass =
	"block -rotate-[17.94deg] text-[5.97cqw] leading-[5.47cqw] font-medium tracking-[1px] whitespace-nowrap text-shadow-[2px_4px_5px_rgba(0,0,0,0.45)]";

/**
 * トップページのファーストビュー（Figma: fast-view 978:352）。
 * 選手写真と体育館写真（Vector 2）を重ね、斜めのキャッチコピーと縦書きの scroll 表示を載せる。
 * 画像群は402px幅より広いため、左右はみ出た分を切り抜く。
 * 寸法はFigmaの402px幅を基準に cqw（このセクション幅に対する%）へ換算し、スマホ幅に比例して伸縮させる。
 */
export function HeroSection() {
	return (
		<section className="@container relative flex w-full justify-center overflow-hidden">
			<div className="grid shrink-0 place-items-start">
				{/* 選手写真（players_img05）。元画像が横向きのため回転＋反転して縦長に見せる */}
				<div className="col-start-1 row-start-1 flex h-[156.48cqw] w-[119.45cqw] items-center justify-center">
					<div className="flex-none -rotate-90 -scale-y-100">
						<div className="relative h-[119.45cqw] w-[156.48cqw]">
							<Image
								src="/images/top-hero.jpg"
								alt="ジャンプボールをする選手たち"
								fill
								sizes="160vw"
								preload
								className="object-cover"
							/>
						</div>
					</div>
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

			<ScrollIndicator />
		</section>
	);
}

/** 左下の縦書き「scroll」＋下向き矢印（Figma: 978:359） */
function ScrollIndicator() {
	return (
		<div
			aria-hidden
			className="absolute bottom-[9.9cqw] left-[4.73cqw] flex w-[22px] flex-col items-center gap-1"
		>
			<span className="text-[22px] leading-[22px] font-medium tracking-[1px] text-brand-red [writing-mode:vertical-rl] text-shadow-[2px_4px_4px_rgba(163,24,27,0.3)]">
				scroll
			</span>
			{/* 矢印SVGは影の分だけ幅があるため、線の位置（x=7.77）を列の中央に合わせる */}
			<span className="relative h-[35px] w-0">
				<Image
					src="/icons/scroll-line.svg"
					alt=""
					width={19.547}
					height={43}
					className="absolute top-0 -left-[7.77px] max-w-none"
				/>
			</span>
		</div>
	);
}
