import Image from "next/image";
import Link from "next/link";

type Props = {
	href: string;
	label: string;
	/** 左端のアイコン（24px 枠に収まる SVG） */
	icon: React.ReactNode;
	/** 右側に出す件数の印（未読○件など）。null なら出さない */
	badge?: string | null;
};

/** 関係者ページTOPのメニュー行（管理画面TOPのメニュー行と同じ見た目に、件数の印を足したもの） */
export function MembersMenuCard({ href, label, icon, badge }: Props) {
	return (
		<Link
			href={href}
			className="flex h-[60px] w-full items-center justify-between gap-2 rounded-[20px] bg-brand-white pr-[6px] pl-[10px] transition-opacity hover:opacity-80"
		>
			<span className="flex min-w-0 items-center gap-[10px]">
				<span className="flex size-6 shrink-0 items-center justify-center text-brand-blue">
					{icon}
				</span>
				<span className="truncate text-[22px] leading-[22px] font-medium tracking-[1px] text-black">
					{label}
				</span>
			</span>
			<span className="flex shrink-0 items-center gap-2">
				{badge && (
					<span className="rounded-[200px] bg-brand-red px-[10px] text-[12px] leading-[22px] font-medium tracking-[1px] text-white">
						{badge}
					</span>
				)}
				<Image
					src="/icons/admin/chevron-right.svg"
					alt=""
					width={12}
					height={24}
				/>
			</span>
		</Link>
	);
}
