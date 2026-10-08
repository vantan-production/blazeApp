import Link from "next/link";

type Props = {
	href: string;
	date: string;
	title: string;
};

/** 日付＋タイトルの一行ニュース。下に白い区切り線が付く（Figma: 978:371） */
export function NewsListItem({ href, date, title }: Props) {
	return (
		<li className="flex flex-col gap-4 after:h-px after:w-full after:bg-white">
			<Link href={href} className="flex flex-col gap-[2px] text-brand-white">
				<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
					{date}
				</time>
				<span className="text-[18px] leading-[22px] tracking-[1px] break-all">
					{title}
				</span>
			</Link>
		</li>
	);
}
