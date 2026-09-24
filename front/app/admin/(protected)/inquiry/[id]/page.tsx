import { InquiryDetail } from "@/components/admin/inquiry/InquiryDetail";

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
	return <InquiryDetail inquiryId={id} />;
}
