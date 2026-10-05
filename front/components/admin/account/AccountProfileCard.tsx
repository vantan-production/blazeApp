import { adminRoleLabel } from "@/lib/admin/account";
import type { CurrentUser } from "@/lib/auth";

type Props = {
	user: CurrentUser;
};

/** ログイン中のユーザーの名前・メールアドレス・ロール（GET /api/admin/me の内容。ページ側で getCurrentUser から渡す） */
export function AccountProfileCard({ user }: Props) {
	const rows = [
		{ label: "名前", value: user.name },
		{ label: "メールアドレス", value: user.email },
		{ label: "権限", value: adminRoleLabel[user.role] },
	];

	return (
		<dl className="grid w-full grid-cols-[88px_1fr] gap-x-[10px] gap-y-2 rounded-[10px] border border-brand-white px-[10px] py-3 leading-[22px] tracking-[1px] text-white">
			{rows.map((row) => (
				<div key={row.label} className="contents">
					<dt className="text-[12px]">{row.label}</dt>
					<dd className="text-[14px] break-all">{row.value}</dd>
				</div>
			))}
		</dl>
	);
}
