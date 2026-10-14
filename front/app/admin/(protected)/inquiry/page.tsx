import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { InquiryList } from "@/components/admin/inquiry/InquiryList";
import {
	INQUIRY_SEARCH_MAX_LENGTH,
	type InquiryTab,
} from "@/components/admin/inquiry/types";
import { adminRoutes } from "@/lib/admin/routes";
import { inquiryStatusSchema } from "@/lib/validation/schemas";

export const metadata = {
	title: "問い合わせ返信 | 西尾ブレイズ 管理画面",
};

type Props = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const first = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value;

/**
 * 問い合わせ一覧（Figma: inquiry 2020:1033）。
 * 表示中のタブと検索語は URL（?status=pending&q=…）で持つ。不正な status は「すべて」扱い
 */
export default async function AdminInquiryPage({ searchParams }: Props) {
	const query = await searchParams;
	const parsedStatus = inquiryStatusSchema.safeParse(first(query.status));
	const tab: InquiryTab = parsedStatus.success ? parsedStatus.data : "all";
	const keyword = (first(query.q) ?? "")
		.trim()
		.slice(0, INQUIRY_SEARCH_MAX_LENGTH);

	return (
		<AdminPageLayout title="問い合わせ返信" backHref={adminRoutes.top}>
			<InquiryList tab={tab} keyword={keyword} />
		</AdminPageLayout>
	);
}
