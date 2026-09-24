import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { InquiryList } from "@/components/admin/inquiry/InquiryList";

export const metadata = {
	title: "問い合わせ返信 | 西尾ブレイズ 管理画面",
};

/** 問い合わせ一覧（Figma: inquiry 2020:1033） */
export default function AdminInquiryPage() {
	return (
		<AdminPageLayout title="問い合わせ返信">
			<InquiryList />
		</AdminPageLayout>
	);
}
