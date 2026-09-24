import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/admin/routes";

/**
 * back の招待メール（back/src/utils/mail.ts の buildInvitationEmail）は `${FRONTEND_URL}/register?token=...` を案内するが、
 * 管理画面の登録画面は /admin/register にあるため、トークンを付けたまま転送する。
 * back のリンクを /admin/register に直したら、このページは消してよい。
 */
export default async function RegisterRedirectPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { token } = await searchParams;
	redirect(
		typeof token === "string"
			? `${adminRoutes.register}?token=${encodeURIComponent(token)}`
			: adminRoutes.register,
	);
}
