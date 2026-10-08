"use client";

import { useEffect } from "react";
import { ErrorView } from "@/components/error/ErrorView";

type Props = {
	error: Error & { digest?: string };
	unstable_retry: () => void;
};

/** 500系エラーページ（Figma: error 2434:1221）。ルートレイアウト配下の実行時エラーを受け取る */
export default function ErrorPage({ error }: Props) {
	useEffect(() => {
		// TODO: エラー監視サービスが決まったら送信する
		console.error(error);
	}, [error]);

	return (
		<>
			<title>エラーが発生しました | 西尾ブレイズ</title>
			<ErrorView
				code="500"
				title={["Internal", "Server Error"]}
				titleClassName="leading-[40px]"
				messages={["エラーが発生しました", "時間をおいてお試しください"]}
			/>
		</>
	);
}
