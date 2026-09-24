import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type Props = {
	children: React.ReactNode;
	/** ヘッダーの高さ分だけ上に余白を空ける（ヘッダーを写真に重ねる場合はfalse） */
	offsetHeader?: boolean;
};

/** スマホ幅（最大 max-w-sp）で中央寄せにし、共通ヘッダーとフッターを載せるページ枠 */
export function PageShell({ children, offsetHeader = true }: Props) {
	return (
		<>
			<SiteHeader />
			<div
				className={`mx-auto flex w-full max-w-sp flex-1 flex-col bg-brand-blue ${
					offsetHeader ? "pt-[96px]" : ""
				}`}
			>
				{children}
				<SiteFooter />
			</div>
		</>
	);
}
