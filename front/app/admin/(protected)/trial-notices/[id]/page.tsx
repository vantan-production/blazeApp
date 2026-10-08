import { TrialNoticeDetail } from "@/components/admin/trial-notices/TrialNoticeDetail";

export const metadata = {
	title: "送信履歴の詳細 | 西尾ブレイズ 管理画面",
};

/** 体験申込者への連絡メールの送信履歴詳細（Figma なし。問い合わせ詳細の見た目に合わせている） */
export default async function AdminTrialNoticeDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <TrialNoticeDetail noticeId={id} />;
}
