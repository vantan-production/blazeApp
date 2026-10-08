import Image from "next/image";
import Link from "next/link";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { NoticeList } from "@/components/admin/notices/NoticeList";
import { adminNoticeRoutes } from "@/lib/admin/routes";

export const metadata = {
	title: "関係者向けお知らせ | 西尾ブレイズ 管理画面",
};

/** 関係者向けお知らせの一覧（ニュース一覧と同じ構成）。右下の＋から新規作成へ */
export default function AdminNoticesPage() {
	return (
		<AdminPageLayout title="関係者向けお知らせ">
			<NoticeList />
			{/* 最後の行が右下の＋ボタンに隠れないようにする余白 */}
			<div aria-hidden className="h-12 shrink-0" />
			{/* 画面下に管理画面と同じ幅の枠を固定し、その右端に＋を置く。
			    --container-sp は @theme inline のため CSS 変数として出力されず var() では参照できない */}
			<div className="pointer-events-none fixed inset-x-0 bottom-6 mx-auto flex w-full max-w-sp justify-end px-6">
				<Link
					href={adminNoticeRoutes.new}
					aria-label="お知らせを新規作成"
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
