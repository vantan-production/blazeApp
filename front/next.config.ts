import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// ホームディレクトリ直下に無関係なpackage-lock.jsonがあり、Turbopackがそれを
	// ワークスペースルートと誤認識してビルドが不安定になるため明示的に固定する。
	turbopack: {
		root: path.join(__dirname),
	},
	experimental: {
		// app/unauthorized.tsx（401ページ）を unauthorized() で表示するために必要
		authInterrupts: true,
	},
};

export default nextConfig;
