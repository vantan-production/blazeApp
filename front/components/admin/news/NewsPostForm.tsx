"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPostForm } from "@/components/admin/AdminPostForm";
import { adminRoutes } from "@/lib/admin/routes";
import { CategorySelector } from "./CategorySelector";

/** ニュース投稿フォーム（Figma: news 2030:1489）。POST /api/news-post に送信し、成功したら一覧へ戻る */
export function NewsPostForm() {
	const router = useRouter();
	const [category, setCategory] = useState<string | undefined>();

	return (
		<AdminPostForm
			endpoint="/api/news-post"
			attachment={{
				name: "image",
				placeholder: "サムネイル画像を選択",
				accept: "image/*",
			}}
			successMessage="ニュースを投稿しました。"
			extraFields={<CategorySelector value={category} onChange={setCategory} />}
			extraValues={{ category }}
			bodyImages={{ name: "images", accept: "image/*" }}
			submitGap="sm"
			onSuccess={() => router.push(adminRoutes.news)}
		/>
	);
}
