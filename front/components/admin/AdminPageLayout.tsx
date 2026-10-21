import { AdminBackLink } from "./AdminBackLink";
import { AdminPageTitle } from "./AdminPageTitle";

type Props = {
	/** 上部の白い見出しボックスの文言 */
	title: string;
	/** 指定すると左上に「戻る」リンクを出す */
	backHref?: string;
	children: React.ReactNode;
};

/** 見出しボックス＋本文の管理画面ページ枠（Figma: news / media / achievements / inquiry の共通レイアウト） */
export function AdminPageLayout({ title, backHref, children }: Props) {
	return (
		<main className="relative flex w-full flex-1 flex-col items-center gap-[40px] px-[27px] pt-[82px] pb-12">
			{backHref && <AdminBackLink href={backHref} />}
			<AdminPageTitle>{title}</AdminPageTitle>
			{children}
		</main>
	);
}
