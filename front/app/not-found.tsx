import type { Metadata } from "next";
import { ErrorView } from "@/components/error/ErrorView";

export const metadata: Metadata = {
	title: "ページが見つかりません | 西尾ブレイズ",
};

/** 404ページ（Figma: error 2434:1118） */
export default function NotFound() {
	return (
		<ErrorView
			code="404"
			title="Not Found"
			titleClassName="leading-[22px] tracking-[4px]"
			messages={["アクセスしようとした", "ページが見つかりませんでした"]}
		/>
	);
}
