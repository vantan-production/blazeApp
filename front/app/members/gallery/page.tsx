import { MemberGallery } from "@/components/members/gallery/MemberGallery";
import { MembersPageLayout } from "@/components/members/MembersPageLayout";

export const metadata = {
	title: "試合写真 | 西尾ブレイズ 関係者ページ",
};

/** 試合風景の原本（モザイクなし）の閲覧・保存と、掲載取り下げの依頼 */
export default function MemberGalleryPage() {
	return (
		<MembersPageLayout title="試合写真">
			<MemberGallery />
		</MembersPageLayout>
	);
}
