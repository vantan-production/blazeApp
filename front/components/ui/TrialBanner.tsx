import Image from "next/image";
import Link from "next/link";
import { routes } from "@/lib/routes";

type Props = {
	onNavigate?: () => void;
};

/** 「ドッジボール体験はこちらから」リンク（Figma: 978:363） */
export function TrialBanner({ onNavigate }: Props) {
	return (
		<Link
			href={routes.trial}
			onClick={onNavigate}
			className="flex h-[44px] w-full items-center justify-between rounded-[8px] bg-brand-white p-1 text-[clamp(15px,4.6vw,18px)] leading-[22px] tracking-[1.5px] text-brand-black"
		>
			ドッジボール体験はこちらから
			<Image src="/icons/external-link.svg" alt="" width={24} height={24} />
		</Link>
	);
}
