import { SiteHeader } from "./SiteHeader";

type Props = {
	children: React.ReactNode;
	/** ヘッダーを最初から背景付きにする。ファーストビュー写真の上に重ねるページではfalse */
	headerWithBackground?: boolean;
	/** ヘッダーの高さ分だけ上に余白を空ける（ヘッダーを写真に重ねる場合はfalse） */
	offsetHeader?: boolean;
};

/** SP幅（402px）で中央寄せにし、共通ヘッダーを載せるページ枠 */
export function PageShell({
	children,
	headerWithBackground = false,
	offsetHeader = true,
}: Props) {
	return (
		<>
			<SiteHeader withBackground={headerWithBackground} />
			<div
				className={`mx-auto flex w-full max-w-[402px] flex-1 flex-col bg-brand-blue ${
					offsetHeader ? "pt-[96px]" : ""
				}`}
			>
				{children}
			</div>
		</>
	);
}
