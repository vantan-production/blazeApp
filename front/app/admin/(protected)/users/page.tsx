import Link from "next/link";
import { redirect } from "next/navigation";
import { UserList } from "@/components/admin/users/UserList";
import {
	UsersNote,
	UsersPageLayout,
} from "@/components/admin/users/UsersPageLayout";
import { adminRoutes } from "@/lib/admin/routes";
import {
	ADMIN_ROLE_DESCRIPTIONS,
	ADMIN_ROLE_LABELS,
	ADMIN_ROLES,
} from "@/lib/admin/users";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
	title: "ユーザー管理 | 西尾ブレイズ 管理画面",
};

const subLinkClass =
	"text-[14px] leading-[22px] tracking-[1px] text-brand-white underline transition-opacity hover:opacity-80";

/** 管理画面ユーザーの一覧・ロール変更・削除依頼（owner 専用。デザイン未作成） */
export default async function AdminUsersPage() {
	const user = await getCurrentUser();
	if (user?.role !== "owner") {
		redirect(adminRoutes.top);
	}

	return (
		<UsersPageLayout title="ユーザー管理" backHref={adminRoutes.top}>
			<nav
				aria-label="ユーザー管理のメニュー"
				className="-mt-6 flex gap-5 self-end"
			>
				<Link href={adminRoutes.invitations} className={subLinkClass}>
					招待
				</Link>
				<Link href={adminRoutes.deleteRequests} className={subLinkClass}>
					削除依頼
				</Link>
			</nav>
			<UsersNote>
				<p className="font-medium">ロールでできること</p>
				<dl className="grid grid-cols-[64px_1fr] gap-x-2 gap-y-1">
					{ADMIN_ROLES.map((role) => (
						<div key={role} className="contents">
							<dt>{ADMIN_ROLE_LABELS[role]}</dt>
							<dd>{ADMIN_ROLE_DESCRIPTIONS[role]}</dd>
						</div>
					))}
				</dl>
				<p className="opacity-80">
					自分のロールは変更できません。オーナーが1人だけのときは、そのオーナーのロールも変更できません。オーナーのアカウントは削除を依頼できません。
				</p>
			</UsersNote>
			<UserList currentUserId={user.id} />
		</UsersPageLayout>
	);
}
