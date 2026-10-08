import Image from "next/image";
import Link from "next/link";

type Props = {
	href: string;
	title: string;
	date: string;
	imageSrc: string;
};

/** サムネイル付きニュースカード（Figma: card 2116:1165） */
export function NewsCard({ href, title, date, imageSrc }: Props) {
	return (
		<Link
			href={href}
			className="flex w-full items-start gap-[2px] overflow-hidden rounded-[16px] bg-brand-white p-1 text-brand-black"
		>
			<div className="relative size-[90px] shrink-0 overflow-hidden rounded-[12px]">
				<Image
					src={imageSrc}
					alt=""
					fill
					sizes="90px"
					className="object-cover"
				/>
			</div>
			<div className="flex min-w-0 flex-1 flex-col justify-center gap-[22px] self-stretch px-4 py-[7px]">
				<p className="text-[14px] whitespace-pre-line">{title}</p>
				<p className="text-[12px]">{date}</p>
			</div>
		</Link>
	);
}
