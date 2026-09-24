import Image from "next/image";
import Link from "next/link";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminNewsList } from "@/components/admin/news/AdminNewsList";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "ニュース投稿 | 西尾ブレイズ 管理画面",
};

/** 投稿済みニュースの一覧（Figma: news 2030:1369）。右下の＋から新規投稿へ */
export default function AdminNewsPage() {
	return (
		<AdminPageLayout title="ニュース投稿">
			<AdminNewsList />
			{/* 最後の行が右下の＋ボタンに隠れないようにする余白 */}
			<div aria-hidden className="h-12 shrink-0" />
			{/* TODO: 各行から編集・削除できるようにする（デザイン未作成。API は PATCH/DELETE /api/news-post/:id がある） */}
			<Link
				href={adminRoutes.newsNew}
				aria-label="ニュースを新規投稿"
				className="fixed bottom-6 flex size-20 items-center justify-center rounded-full bg-white shadow-[0px_4px_4px_rgba(0,0,0,0.15)] right-[max(24px,calc((100vw-var(--container-sp))/2+24px))]"
			>
				<Image
					src="/icons/admin/plus-large.svg"
					alt=""
					width={60}
					height={60}
				/>
			</Link>
		</AdminPageLayout>
	);
}
