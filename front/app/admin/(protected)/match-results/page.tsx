import Image from "next/image";
import Link from "next/link";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { MatchResultList } from "@/components/admin/match-results/MatchResultList";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "試合結果 | 西尾ブレイズ 管理画面",
};

/** 試合結果の一覧（アンケート一覧と同じ構成）。右下の＋から新規登録へ */
export default function AdminMatchResultsPage() {
	return (
		<AdminPageLayout title="試合結果" backHref={adminRoutes.top}>
			<MatchResultList />
			{/* 最後の行が右下の＋ボタンに隠れないようにする余白 */}
			<div aria-hidden className="h-12 shrink-0" />
			{/* 画面下に管理画面と同じ幅の枠を固定し、その右端に＋を置く */}
			<div className="pointer-events-none fixed inset-x-0 bottom-6 mx-auto flex w-full max-w-sp justify-end px-6">
				<Link
					href={adminRoutes.matchResultsNew}
					aria-label="試合結果を新規登録"
					className="pointer-events-auto flex size-20 items-center justify-center rounded-full bg-white shadow-[0px_6px_10px_rgba(0,0,0,0.35)]"
				>
					<Image
						src="/icons/admin/plus-large.svg"
						alt=""
						width={60}
						height={60}
					/>
				</Link>
			</div>
		</AdminPageLayout>
	);
}
