import type { Metadata } from "next";
import { Noto_Sans_JP, Savate } from "next/font/google";
import { PcFrame } from "@/components/layout/PcFrame";
import "./globals.css";

// 文字は Noto Sans JP にそろえる。Savate は英字の飾りラベル（TEAM・WIN など）だけに使う
const notoSansJp = Noto_Sans_JP({
	variable: "--font-next-noto-sans-jp",
	subsets: ["latin"],
	weight: ["400", "500", "700", "900"],
});

const savate = Savate({
	variable: "--font-next-savate",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "西尾ブレイズ",
	description:
		"創部19年目、愛知県ドッジボール協会所属のクラブチーム「西尾ブレイズ」の公式サイトです。",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="ja"
			className={`${notoSansJp.variable} ${savate.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col font-sans">
				<PcFrame />
				{children}
			</body>
		</html>
	);
}
