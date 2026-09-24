import Image from "next/image";

type Props = {
	children: React.ReactNode;
};

/**
 * ログイン・新規登録画面の白いカード（Figma: Frame 132 1700:3155）。
 * 上部のロゴ枠（100x100）にはサイトのロゴを表示する。
 */
export function AdminAuthCard({ children }: Props) {
	return (
		<main className="flex w-full flex-1 flex-col items-center px-[27px] pt-[144px] pb-12">
			<div className="flex w-full flex-col items-center gap-2 rounded-[20px] bg-brand-white px-5 pt-[55px] pb-[38px]">
				<div className="flex size-[100px] items-center justify-center">
					<Image
						src="/images/logo.png"
						alt="西尾ブレイズ"
						width={109}
						height={64}
						className="h-auto w-[100px]"
					/>
				</div>
				{children}
			</div>
		</main>
	);
}
