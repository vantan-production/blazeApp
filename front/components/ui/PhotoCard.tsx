import Image from "next/image";
import Link from "next/link";

type Props = {
	title: string;
	href: string;
	imageSrc?: string;
};

/** 背景写真にタイトルを重ねたリンクカード（Figma: card 978:569）。幅は親に合わせ、比率172:120を保つ */
export function PhotoCard({
	title,
	href,
	imageSrc = "/images/card-bg.png",
}: Props) {
	return (
		<Link
			href={href}
			className="relative flex aspect-[172/120] w-full items-center justify-center overflow-hidden rounded-[4px] p-[10px]"
		>
			<Image
				src={imageSrc}
				alt=""
				fill
				sizes="172px"
				className="object-cover"
			/>
			<span className="relative w-full text-center font-mincho text-[clamp(18px,5.5vw,22px)] leading-[26px] tracking-[1.5px] text-black">
				{title}
			</span>
		</Link>
	);
}
