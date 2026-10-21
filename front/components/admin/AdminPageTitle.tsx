type Props = {
	children: React.ReactNode;
};

/** 管理画面各ページ上部の白い見出しボックス（Figma: ニュース投稿 2030:1376） */
export function AdminPageTitle({ children }: Props) {
	return (
		<h1 className="flex h-16 w-full items-center justify-center rounded-[20px] bg-brand-white text-[22px] leading-[22px] font-medium tracking-[1px] text-black">
			{children}
		</h1>
	);
}
