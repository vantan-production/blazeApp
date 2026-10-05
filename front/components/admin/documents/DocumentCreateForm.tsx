"use client";

import { useRouter } from "next/navigation";
import { adminRoutes } from "@/lib/admin/routes";
import { useToastStore } from "@/lib/store/useToastStore";
import { DocumentForm } from "./DocumentForm";

/** 資料の新規登録（POST /api/documents）。登録できたら一覧へ戻る */
export function DocumentCreateForm() {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	return (
		<DocumentForm
			onSaved={() => {
				showToast("資料を登録しました。");
				router.push(adminRoutes.documents);
			}}
		/>
	);
}
