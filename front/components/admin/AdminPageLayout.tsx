import { AdminPageTitle } from "./AdminPageTitle";

type Props = {
	/** 上部の白い見出しボックスの文言 */
	title: string;
	children: React.ReactNode;
};

/** 見出しボックス＋本文の管理画面ページ枠（Figma: news / media / achievements / inquiry の共通レイアウト） */
export function AdminPageLayout({ title, children }: Props) {
	return (
		<main className="flex w-full flex-1 flex-col items-center gap-[82px] px-[27px] pt-[82px] pb-12">
			<AdminPageTitle>{title}</AdminPageTitle>
			{children}
		</main>
	);
}
