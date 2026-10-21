import { AdminAuthCard } from "@/components/admin/AdminAuthCard";
import {
	type Invitation,
	RegisterForm,
} from "@/components/admin/login/RegisterForm";
import { adminRoutes } from "@/lib/admin/routes";
import { API_BASE_URL } from "@/lib/apiClient";

export const metadata = {
	title: "新規登録 | 西尾ブレイズ 管理画面",
};

type VerifyResult =
	| { ok: true; invitation: Invitation }
	| { ok: false; message: string };

/**
 * 招待トークンが使えるかを back に確認する（GET /api/admin/invitations/verify、認証不要）。
 * 無効なリンクで入力させてから弾くより、開いた時点で案内した方が親切なため表示前に確認する。
 * 成功時は招待先のメールアドレスが返るので、登録フォームのメール欄に入れておく（back は宛先一致を必須にしている）。
 */
const verifyInvitation = async (token: string): Promise<VerifyResult> => {
	try {
		const res = await fetch(
			`${API_BASE_URL}/api/admin/invitations/verify?token=${encodeURIComponent(token)}`,
			{ cache: "no-store" },
		);
		const body = (await res.json().catch(() => null)) as {
			data?: Invitation;
			errors?: unknown;
		} | null;
		if (res.ok && body?.data) return { ok: true, invitation: body.data };
		return {
			ok: false,
			message:
				typeof body?.errors === "string"
					? body.errors
					: "招待リンクが無効です。owner に再発行を依頼してください。",
		};
	} catch {
		return {
			ok: false,
			message:
				"招待リンクを確認できませんでした。時間をおいて再度お試しください。",
		};
	}
};

/** 管理画面の新規登録（Figma: login 2424:984）。owner が送った招待メールのリンク（?token=...）から開く */
export default async function AdminRegisterPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { token } = await searchParams;
	const invitationToken = typeof token === "string" ? token : null;
	const verified = invitationToken
		? await verifyInvitation(invitationToken)
		: null;

	return (
		<AdminAuthCard backHref={adminRoutes.login}>
			<RegisterForm
				invitationToken={verified?.ok ? invitationToken : null}
				invitation={verified?.ok ? verified.invitation : null}
				invitationError={verified && !verified.ok ? verified.message : null}
			/>
		</AdminAuthCard>
	);
}
