import type { Metadata } from "next";
import {
	Inter,
	M_PLUS_Rounded_1c,
	Noto_Sans_JP,
	Savate,
	Sawarabi_Mincho,
} from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
	variable: "--font-next-noto-sans-jp",
	subsets: ["latin"],
	weight: ["400", "500", "700", "900"],
});

const savate = Savate({
	variable: "--font-next-savate",
	subsets: ["latin"],
});

const sawarabiMincho = Sawarabi_Mincho({
	variable: "--font-next-sawarabi-mincho",
	subsets: ["latin"],
	weight: "400",
});

const mplusRounded = M_PLUS_Rounded_1c({
	variable: "--font-next-mplus-rounded",
	subsets: ["latin"],
	weight: ["700"],
});

const inter = Inter({
	variable: "--font-next-inter",
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
			className={`${notoSansJp.variable} ${savate.variable} ${sawarabiMincho.variable} ${mplusRounded.variable} ${inter.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col font-sans">{children}</body>
		</html>
	);
}
