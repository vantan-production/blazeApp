import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { InquiryDetail } from "@/components/admin/inquiry/InquiryDetail";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "問い合わせ詳細 | 西尾ブレイズ 管理画面",
};

/** 問い合わせ詳細・返信（Figma: inquiry 2027:1238） */
export default async function AdminInquiryDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		// 左上に「戻る」を置く（AdminBackLink は absolute のため relative の枠で包む）。
		// 上の余白は AdminPageLayout（pt-[82px]）と見出しの位置をそろえるため
		<div className="relative flex w-full flex-1 flex-col pt-[44px]">
			<AdminBackLink href={adminRoutes.inquiry} />
			<InquiryDetail inquiryId={id} />
		</div>
	);
}
