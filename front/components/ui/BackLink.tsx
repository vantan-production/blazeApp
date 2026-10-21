"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
	/** 戻る先の履歴が無いとき（直接アクセス・外部サイトから来たときなど）の行き先 */
	fallbackHref: string;
	children: React.ReactNode;
};

/** Navigation API の、ここで使う部分だけ（未対応ブラウザでは window.navigation が無い） */
type NavigationLike = { canGoBack: boolean };

/**
 * このサイト内に戻れる前のページがあるか。
 * Navigation API の canGoBack は同じオリジンの履歴だけを見るため、外部サイトから来たときは false になる。
 * 未対応のブラウザでは判定できないので false（fallbackHref へのリンクとして動く）
 */
function canGoBackInSite(): boolean {
	const navigation = (window as Window & { navigation?: NavigationLike })
		.navigation;
	return navigation?.canGoBack ?? false;
}

/**
 * 詳細ページ左上の「戻る」リンク。トップ・一覧など、来たページに戻る。
 * 戻れる履歴が無いときは fallbackHref へ移動する。新しいタブで開く操作（Ctrl/⌘クリックなど）はそのまま fallbackHref を開く
 */
export function BackLink({ fallbackHref, children }: Props) {
	const router = useRouter();

	return (
		<Link
			href={fallbackHref}
			onClick={(event) => {
				const isPlainClick =
					event.button === 0 &&
					!event.metaKey &&
					!event.ctrlKey &&
					!event.shiftKey &&
					!event.altKey;
				if (!isPlainClick || !canGoBackInSite()) return;
				event.preventDefault();
				router.back();
			}}
			className="-ml-2 flex items-center self-start py-1 pr-2 text-[14px] leading-[22px] tracking-[1px]"
		>
			<ChevronLeft aria-hidden size={24} strokeWidth={2} />
			{children}
		</Link>
	);
}
