import Image from "next/image";

type Props = {
	src: string;
	alt: string;
	width?: number;
	height?: number;
};

/** 白枠付きの角丸画像（Figma: image 2116:1224） */
export function FramedImage({ src, alt, width = 260, height = 173 }: Props) {
	return (
		<div
			className="relative overflow-hidden rounded-[12px] border-4 border-brand-white"
			style={{ width, height }}
		>
			<Image
				src={src}
				alt={alt}
				fill
				sizes={`${width}px`}
				className="object-cover"
			/>
		</div>
	);
}
