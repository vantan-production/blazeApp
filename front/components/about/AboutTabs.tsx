import Image from "next/image";
import Link from "next/link";
import { routes } from "@/lib/routes";

const tabs = [
	{ key: "team", label: "チーム紹介", href: routes.team },
	{ key: "coaches", label: "コーチ紹介", href: routes.coaches },
] as const;

type AboutTabItem = (typeof tabs)[number];

type Props = {
	/** 現在表示中のタブ */
	current: AboutTabItem["key"];
};

/** 「チーム紹介」「コーチ紹介」を切り替えるタブ（Figma: title 874:373 / 1427:648） */
export function AboutTabs({ current }: Props) {
	const [team, coaches] = tabs;
	return (
		<nav
			aria-label="紹介ページの切り替え"
			className="flex w-full items-center justify-center gap-4 border-y-2 border-brand-white px-[27px] py-4"
		>
			<AboutTab tab={team} isCurrent={current === team.key} />
			<Image src="/icons/tab-divider.svg" alt="" width={2} height={22} />
			<AboutTab tab={coaches} isCurrent={current === coaches.key} />
		</nav>
	);
}

function AboutTab({
	tab,
	isCurrent,
}: {
	tab: AboutTabItem;
	isCurrent: boolean;
}) {
	return (
		<Link
			href={tab.href}
			aria-current={isCurrent ? "page" : undefined}
			className={`flex min-w-0 flex-1 items-center justify-center rounded-[1000px] border-2 border-brand-white px-6 py-3 text-[16px] whitespace-nowrap ${
				isCurrent
					? "bg-brand-white text-brand-black"
					: "bg-brand-blue text-brand-white"
			}`}
		>
			{tab.label}
		</Link>
	);
}
