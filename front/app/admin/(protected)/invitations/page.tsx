import { redirect } from "next/navigation";
import { InvitationList } from "@/components/admin/users/InvitationList";
import { UsersPageLayout } from "@/components/admin/users/UsersPageLayout";
import { adminRoutes } from "@/lib/admin/routes";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
	title: "招待 | 西尾ブレイズ 管理画面",
};

/** 管理画面ユーザーの招待（発行・一覧・取り消し。owner 専用。デザイン未作成） */
export default async function AdminInvitationsPage() {
	const user = await getCurrentUser();
	if (user?.role !== "owner") {
		redirect(adminRoutes.top);
	}

	return (
		<UsersPageLayout title="招待" backHref={adminRoutes.users}>
			<InvitationList />
		</UsersPageLayout>
	);
}
