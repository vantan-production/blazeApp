import Image from "next/image";
import Link from "next/link";
import type { NavItem } from "@/lib/routes";

type Props = {
	items: NavItem[];
	onNavigate?: () => void;
};

/** 矢印付きのナビリンク縦並び（Figma: Frame 170 1700:1883） */
export function NavLinkList({ items, onNavigate }: Props) {
	return (
		<ul className="flex w-[164px] flex-col gap-[9px]">
			{items.map((item) => (
				<li key={item.label}>
					<Link
						href={item.href}
						onClick={onNavigate}
						className="flex w-full items-center justify-between text-[14px] leading-[22px] tracking-[1px] text-brand-white"
					>
						{item.label}
						<Image src="/icons/arrow-right.svg" alt="" width={12} height={24} />
					</Link>
				</li>
			))}
		</ul>
	);
}
