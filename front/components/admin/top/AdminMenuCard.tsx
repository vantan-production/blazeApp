import Image from "next/image";
import Link from "next/link";

export type AdminMenuIcon = {
	src: string;
	width: number;
	height: number;
};

type Props = {
	href: string;
	label: string;
	icon: AdminMenuIcon;
};

/** 管理画面TOPのメニュー行（Figma: Frame 132 2020:1001） */
export function AdminMenuCard({ href, label, icon }: Props) {
	return (
		<Link
			href={href}
			className="flex h-[60px] w-full items-center justify-between rounded-[20px] bg-brand-white pr-[6px] pl-[10px] transition-opacity"
		>
			<span className="flex items-center gap-[10px]">
				<span className="flex size-6 items-center justify-center">
					<Image
						src={icon.src}
						alt=""
						width={icon.width}
						height={icon.height}
					/>
				</span>
				<span className="text-[22px] leading-[22px] font-medium tracking-[1px] text-black">
					{label}
				</span>
			</span>
			<Image
				src="/icons/admin/chevron-right.svg"
				alt=""
				width={12}
				height={24}
			/>
		</Link>
	);
}
