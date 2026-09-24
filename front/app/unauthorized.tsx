import type { Metadata } from "next";
import { ErrorView } from "@/components/error/ErrorView";

export const metadata: Metadata = {
	title: "認証が必要です | 西尾ブレイズ",
};

/**
 * 401ページ（Figma: error 2434:1198）。
 * next/navigation の unauthorized() を呼んだときに表示される（next.config の authInterrupts が必要）。
 */
export default function Unauthorized() {
	return (
		<ErrorView
			code="401"
			title="Unauthorized"
			titleClassName="leading-[22px] tracking-[2px]"
			messages={["このページを表示するには", "ログインが必要です"]}
		/>
	);
}
