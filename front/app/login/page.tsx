import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/admin/routes";

// lib/apiClient.ts・lib/auth.ts は未認証時に /login へ飛ばすため、管理画面のログインへ転送する
export default function LoginRedirectPage() {
	redirect(adminRoutes.login);
}
