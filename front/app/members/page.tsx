import Link from "next/link";
import { MembersMenu } from "@/components/members/MembersMenu";
import { adminRoutes } from "@/lib/admin/routes";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
	title: "TOP | 西尾ブレイズ 関係者ページ",
};

/** 関係者ページTOP。各機能へのメニュー（未読のお知らせ・未回答のアンケートの件数付き） */
export default async function MembersTopPage() {
	// 未ログインは layout でリダイレクト済み。ここでは名前と管理画面への導線の出し分けに使う
	const user = await getCurrentUser();
	const canManage = user?.role === "owner" || user?.role === "admin";

	return (
		<main className="flex w-full flex-1 flex-col items-center gap-[60px] px-[27px] pt-[54px] pb-12">
			<div className="flex flex-col items-center gap-4 text-brand-white">
				<h1 className="text-[36px] leading-[40px] tracking-[1.5px]">
					関係者ページ
				</h1>
				{user && (
					<p className="text-[14px] leading-[22px] tracking-[1px]">
						{user.name} さん
					</p>
				)}
			</div>
			<MembersMenu />
			{canManage && (
				<Link
					href={adminRoutes.top}
					className="text-[14px] leading-[22px] tracking-[1px] text-brand-white underline transition-opacity hover:opacity-80"
				>
					管理画面へ
				</Link>
			)}
		</main>
	);
}
