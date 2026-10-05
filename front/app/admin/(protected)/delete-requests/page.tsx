import { redirect } from "next/navigation";
import { DeleteRequestList } from "@/components/admin/users/DeleteRequestList";
import {
	UsersNote,
	UsersPageLayout,
} from "@/components/admin/users/UsersPageLayout";
import { adminRoutes } from "@/lib/admin/routes";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
	title: "削除依頼 | 西尾ブレイズ 管理画面",
};

/** アカウント削除依頼の承認・取り消し（owner 専用。デザイン未作成） */
export default async function AdminDeleteRequestsPage() {
	const user = await getCurrentUser();
	if (user?.role !== "owner") {
		redirect(adminRoutes.top);
	}

	return (
		<UsersPageLayout title="削除依頼" backHref={adminRoutes.users}>
			{/* back/src/admin/deleteRequest.ts の仕組み（deletion_approvals）を運用担当者向けに説明する */}
			<UsersNote>
				<p className="font-medium">アカウント削除のしくみ</p>
				<ul className="list-disc pl-4">
					<li>
						「ユーザー管理」で削除を依頼すると、依頼した人は承認済みになります。
					</li>
					<li>
						ほかのオーナー全員が承認すると、そのアカウントは削除されてログインできなくなります。オーナーが1人だけのときは、依頼した時点で削除されます。
					</li>
					<li>依頼は24時間で無効になり、この一覧からも消えます。</li>
					<li>
						どのオーナーでも依頼を取り消し（却下）できます。取り消すとそれまでの承認もなくなります。
					</li>
					<li>
						すでに承認した依頼をもう一度承認しようとすると「既に承認済みです。」と表示されます（承認済みかどうかは一覧には出ません）。
					</li>
				</ul>
			</UsersNote>
			<DeleteRequestList currentUserId={user.id} />
		</UsersPageLayout>
	);
}
