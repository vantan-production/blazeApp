import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { TrialNoticeDetail } from "@/components/admin/trial-notices/TrialNoticeDetail";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "送信履歴の詳細 | 西尾ブレイズ 管理画面",
};

/** 体験申込者への連絡メールの送信履歴詳細（Figma なし。問い合わせ詳細の見た目に合わせている） */
export default async function AdminTrialNoticeDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		// 左上に「戻る」を置く（AdminBackLink は absolute のため relative の枠で包む）。
		// 上の余白は AdminPageLayout（pt-[82px]）と見出しの位置をそろえるため
		<div className="relative flex w-full flex-1 flex-col pt-[44px]">
			<AdminBackLink href={adminRoutes.trialNotices} />
			<TrialNoticeDetail noticeId={id} />
		</div>
	);
}
