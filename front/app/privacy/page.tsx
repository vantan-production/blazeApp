import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { ContentPanel } from "@/components/ui/ContentPanel";
import { PageTitle } from "@/components/ui/PageTitle";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
	title: "プライバシーポリシー | 西尾ブレイズ",
};

type PolicySection = { title: string; body: React.ReactNode };

const listClass = "flex list-disc flex-col gap-1 pl-5";

// TODO: 保持期間・お問い合わせ窓口はチームで確定したら具体的な内容に差し替える（docs/site-concerns.md C-1 / C-2）
const sections: PolicySection[] = [
	{
		title: "取得する情報",
		body: (
			<>
				<p>当チームは、次の場面でお客さまの情報をお預かりします。</p>
				<ul className={listClass}>
					<li>
						ドッジボール体験のお申し込み：お子さまのお名前・フリガナ・性別・生年月日・学校名・塾、保護者さまの電話番号・メールアドレス、体験のきっかけ
					</li>
					<li>お問い合わせ：お名前・メールアドレス・件名・お問い合わせ内容</li>
					<li>
						関係者エリアのご利用：お名前・メールアドレス、提出物やアンケートへのご回答
					</li>
					<li>練習や試合で撮影した写真・動画</li>
				</ul>
			</>
		),
	},
	{
		title: "利用目的",
		body: (
			<ul className={listClass}>
				<li>体験練習のご案内・日程のご連絡のため</li>
				<li>お問い合わせへの回答のため</li>
				<li>チームの運営に必要なご連絡・お知らせのため</li>
				<li>チームの活動を紹介するため（写真・動画の掲載）</li>
			</ul>
		),
	},
	{
		title: "第三者への提供",
		body: (
			<p>
				法令にもとづく場合を除き、ご本人（お子さまの場合は保護者さま）の同意なく、個人情報を第三者に提供することはありません。
			</p>
		),
	},
	{
		title: "安全管理",
		body: (
			<p>
				お預かりした個人情報は、チームの運営にかかわる限られた者だけが扱い、漏えい・紛失などが起きないよう適切に管理します。不要になった情報は速やかに削除します。
			</p>
		),
	},
	{
		title: "写真・動画の掲載",
		body: (
			<p>
				サイトに掲載している写真・動画の取り下げをご希望の場合は、関係者エリアの取り下げ依頼、またはお問い合わせフォームからご連絡ください。確認のうえ速やかに対応します。
			</p>
		),
	},
	{
		title: "Cookieの利用",
		body: (
			<p>
				関係者エリアのログイン状態を保つためにCookieを使用します。広告や閲覧履歴の追跡には使用しません。
			</p>
		),
	},
	{
		title: "開示・訂正・削除",
		body: (
			<p>
				ご本人または保護者さまから、個人情報の開示・訂正・利用停止・削除のご希望があった場合は、ご本人であることを確認したうえで速やかに対応します。
			</p>
		),
	},
	{
		title: "お問い合わせ窓口",
		body: (
			<p>
				個人情報の取り扱いに関するお問い合わせは、
				<Link
					href={`${routes.activities}#inquiry`}
					className="underline underline-offset-2"
				>
					お問い合わせフォーム
				</Link>
				からご連絡ください。
			</p>
		),
	},
	{
		title: "改定",
		body: (
			<p>
				本ポリシーは、必要に応じて内容を見直し、改定することがあります。改定した場合はこのページでお知らせします。
			</p>
		),
	},
];

/** プライバシーポリシー。体験申し込み・お問い合わせフォームの同意チェックとフッターから開く */
export default function PrivacyPage() {
	return (
		<PageShell>
			<main className="flex flex-col gap-6 pb-10">
				<PageTitle>プライバシーポリシー</PageTitle>
				<div className="flex w-full flex-col items-center gap-8 px-6">
					<p className="text-[14px] leading-[1.8] tracking-[1px]">
						西尾ブレイズ（以下「当チーム」）は、お預かりする個人情報、とくにお子さまの情報を大切に扱うため、次のとおり取り扱いを定めます。
					</p>
					{sections.map((section) => (
						<ContentPanel
							key={section.title}
							title={section.title}
							titleAs="h2"
						>
							<div className="flex flex-col gap-2 text-[14px] leading-[1.8]">
								{section.body}
							</div>
						</ContentPanel>
					))}
					<p className="self-end text-[12px] tracking-[1px]">
						2026年10月26日 制定
					</p>
				</div>
			</main>
		</PageShell>
	);
}
