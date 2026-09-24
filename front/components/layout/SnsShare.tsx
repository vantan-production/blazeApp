import Image from "next/image";

// TODO: チームの公式アカウントURLが決まったら差し替える
const snsLinks = [
	{
		label: "Instagram",
		href: "https://www.instagram.com/",
		icon: "/icons/instagram.svg",
		width: 36,
		height: 36,
	},
	{
		label: "X",
		href: "https://x.com/",
		icon: "/icons/x.svg",
		width: 36,
		height: 32.6263,
	},
	{
		label: "LINE",
		href: "https://line.me/",
		icon: "/icons/line.svg",
		width: 30,
		height: 30,
	},
];

/** SNSシェアリンク（Figma: 1700:2724） */
export function SnsShare() {
	return (
		<div className="flex w-[142px] flex-col items-center gap-2">
			<p className="w-full text-center font-inter text-[12px] text-white">
				SHARE
			</p>
			<ul className="flex w-full items-center justify-center gap-5">
				{snsLinks.map((sns) => (
					<li key={sns.label}>
						<a
							href={sns.href}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={sns.label}
							className="flex size-9 items-center justify-center"
						>
							<Image
								src={sns.icon}
								alt=""
								width={sns.width}
								height={sns.height}
							/>
						</a>
					</li>
				))}
			</ul>
		</div>
	);
}
