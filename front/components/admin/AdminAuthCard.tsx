import Image from "next/image";
import Link from "next/link";

type Props = {
	/** 指定するとカード左上の外側に「戻る」リンクを出す */
	backHref?: string;
	children: React.ReactNode;
};

/**
 * ログイン・新規登録画面の白いカード（Figma: Frame 132 1700:3155）。
 * 上部にチームロゴ（黒背景の横長画像 nishioBlaze.jpg）を表示する。
 */
export function AdminAuthCard({ backHref, children }: Props) {
	return (
		<main className="relative flex w-full flex-1 flex-col items-center px-[27px] pt-[144px] pb-12">
			{backHref && (
				<Link
					href={backHref}
					className="absolute top-6 left-[27px] inline-flex items-center gap-1 py-2 pr-2 text-[16px] leading-[16px] font-medium tracking-[1px] text-white transition-opacity hover:opacity-80"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={2.5}
						strokeLinecap="round"
						strokeLinejoin="round"
						className="size-5"
					>
						<path d="M15 18l-6-6 6-6" />
					</svg>
					戻る
				</Link>
			)}
			<div className="flex w-full flex-col items-center gap-2 rounded-[20px] bg-brand-white px-5 pt-[55px] pb-[38px]">
				<Image
					src="/img/nishioBlaze.jpg"
					alt="西尾ブレイズ Aichi Dodge Ball Club Team"
					width={1873}
					height={874}
					sizes="214px"
					className="h-auto w-[214px]"
				/>
				{children}
			</div>
		</main>
	);
}
