import Image from "next/image";
import Link from "next/link";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminDocumentList } from "@/components/admin/documents/AdminDocumentList";
import { adminRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "資料庫 | 西尾ブレイズ 管理画面",
};

/** 関係者向け資料庫の一覧（デザイン未作成。試合風景一覧と同じ枠で作る）。右下の＋から新規登録へ */
export default function AdminDocumentsPage() {
	return (
		<AdminPageLayout title="資料庫" backHref={adminRoutes.top}>
			<p className="-mt-12 w-full text-[13px] leading-[20px] tracking-[1px] text-brand-white/80">
				ここに登録した資料は、関係者ページからダウンロードできます（一般公開はされません）。
			</p>
			<AdminDocumentList />
			{/* 最後の行が右下の＋ボタンに隠れないようにする余白 */}
			<div aria-hidden className="h-12 shrink-0" />
			{/* 画面下に管理画面と同じ幅の枠を固定し、その右端に＋を置く。
			    --container-sp は @theme inline のため CSS 変数として出力されず var() では参照できない */}
			<div className="pointer-events-none fixed inset-x-0 bottom-6 mx-auto flex w-full max-w-sp justify-end px-6">
				<Link
					href={adminRoutes.documentsNew}
					aria-label="資料を新規登録"
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
