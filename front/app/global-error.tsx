"use client";

import { Noto_Sans_JP } from "next/font/google";
import { useEffect } from "react";
import { ErrorView } from "@/components/error/ErrorView";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
	variable: "--font-next-noto-sans-jp",
	subsets: ["latin"],
	weight: ["500"],
});

type Props = {
	error: Error & { digest?: string };
	unstable_retry: () => void;
};

/**
 * ルートレイアウト自体で発生したエラー用の500ページ（Figma: error 2434:1221）。
 * ルートレイアウトを置き換えるため html / body とフォント・スタイルを自前で読み込む。
 */
export default function GlobalError({ error }: Props) {
	useEffect(() => {
		// TODO: エラー監視サービスが決まったら送信する
		console.error(error);
	}, [error]);

	return (
		<html lang="ja" className={`${notoSansJp.variable} h-full antialiased`}>
			<body className="min-h-full flex flex-col font-sans">
				<title>エラーが発生しました | 西尾ブレイズ</title>
				<ErrorView
					code="500"
					title={["Internal", "Server Error"]}
					titleClassName="leading-[40px]"
					messages={["エラーが発生しました", "時間をおいてお試しください"]}
				/>
			</body>
		</html>
	);
}
