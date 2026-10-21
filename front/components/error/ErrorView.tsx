import Link from "next/link";
import { routes } from "@/lib/routes";

type Props = {
	/** 大きく表示するステータスコード（例: "404"） */
	code: string;
	/** ステータス名。配列にすると行ごとに改行する */
	title: string | string[];
	/** ステータス名の字間・行間（Figma上でページごとに異なる） */
	titleClassName?: string;
	/** 説明文。配列の要素ごとに改行する */
	messages: string[];
};

/** エラーページ共通の表示（Figma: エラーページ 2434:1116） */
export function ErrorView({
	code,
	title,
	titleClassName = "leading-[22px]",
	messages,
}: Props) {
	const titleLines = Array.isArray(title) ? title : [title];

	return (
		<main className="flex min-h-dvh w-full flex-1 flex-col items-center justify-center gap-[98px] bg-brand-blue px-4 py-16 font-medium text-brand-white">
			<div className="flex flex-col items-center gap-8">
				<div className="flex w-[210px] flex-col items-center gap-[18px]">
					<p className="flex h-[90px] items-center text-[120px] leading-none tracking-[1px]">
						{code}
					</p>
					<h1 className={`w-[256px] text-center text-[32px] ${titleClassName}`}>
						{titleLines.map((line) => (
							<span key={line} className="block">
								{line}
							</span>
						))}
					</h1>
				</div>
				{/* 最長行（14文字）が狭いスマホ幅でも1行に収まるよう、402px幅で22pxになるように縮める */}
				<p className="text-center text-[clamp(18px,5.48vw,22px)] leading-[22px] tracking-[1px] text-white">
					{messages.map((line) => (
						<span key={line} className="block">
							{line}
						</span>
					))}
				</p>
			</div>
			<Link
				href={routes.top}
				className="flex h-[50px] w-[160px] items-center justify-center border border-brand-white text-[22px] leading-[22px] tracking-[1px] transition-colors hover:bg-brand-white hover:text-brand-blue"
			>
				トップに戻る
			</Link>
		</main>
	);
}
