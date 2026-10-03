import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import { RegisterForm } from "@/components/admin/login/RegisterForm";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "新規登録 | 西尾ブレイズ 管理画面",
};

/** 管理画面の新規登録（Figma: login 2424:984）。owner が送った招待メールのリンク（?token=...）から開く */
export default async function AdminRegisterPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { token } = await searchParams;

	return (
		<AdminAuthCard backHref={adminRoutes.login}>
			<RegisterForm
				invitationToken={typeof token === "string" ? token : null}
			/>
		</AdminAuthCard>
	);
}
