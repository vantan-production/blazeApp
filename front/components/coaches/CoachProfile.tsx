import Image from "next/image";
import { ContentPanel } from "@/components/ui/ContentPanel";
import { type CoachRole, CoachRoleBadge } from "./CoachRoleBadge";

export type Coach = {
	name: string;
	/** 役職（監督／コーチ）。名前の横にバッジで表示する */
	role: CoachRole;
	/** 写真（本人に限らずペットなどの写真やアイコンでもよい） */
	photoSrc: string;
	/** 一言コメント */
	comment: string;
	/** 指導方針 */
	policy: string;
	/** 趣味、特技 */
	hobby: string;
};

type Props = {
	coach: Coach;
};

/**
 * 監督・コーチ1人分の紹介（Figma: coach 2025:1217 ＋ introduce_wrapper 2019:1184）。
 * 写真・名前・一言コメントの下に、指導方針と趣味・特技のパネルを並べる。
 */
export function CoachProfile({ coach }: Props) {
	return (
		<article className="flex w-full flex-col gap-5">
			<div className="flex min-h-[150px] items-center gap-3">
				<div className="relative h-[150px] w-[120px] shrink-0 overflow-hidden rounded-[20px]">
					<Image
						src={coach.photoSrc}
						alt={`${coach.name}の写真`}
						fill
						sizes="120px"
						className="object-cover object-top"
					/>
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-2 self-stretch pt-3 text-white">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<h2 className="font-savate text-[22px] leading-[22px] tracking-[1.5px] whitespace-nowrap">
							{coach.name}
						</h2>
						<CoachRoleBadge role={coach.role} />
					</div>
					<p className="max-w-[208px] text-[16px] leading-[22px] tracking-[1px]">
						{coach.comment}
					</p>
				</div>
			</div>
			<div className="flex w-full flex-col items-center gap-4 rounded-[20px] bg-brand-white">
				<ContentPanel title="指導方針">
					<p className="text-center">{coach.policy}</p>
				</ContentPanel>
				<Image src="/icons/divider-line.svg" alt="" width={211} height={1} />
				<ContentPanel title="趣味、特技">
					<p className="text-center">{coach.hobby}</p>
				</ContentPanel>
			</div>
		</article>
	);
}
