import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// ホームディレクトリ直下に無関係なpackage-lock.jsonがあり、Turbopackがそれを
	// ワークスペースルートと誤認識してビルドが不安定になるため明示的に固定する。
	turbopack: {
		root: path.join(__dirname),
	},
	images: {
		// backが返す画像はS3の署名付きURL（https://<bucket>.s3.ap-northeast-1.amazonaws.com/...?X-Amz-...）。
		// next/image で最適化するにはホストを許可する必要がある。
		// 署名のクエリは毎回変わるため search は指定せず、クエリ付きURLをそのまま通す
		remotePatterns: [
			{
				protocol: "https",
				hostname: "*.s3.ap-northeast-1.amazonaws.com",
				pathname: "/**",
			},
		],
	},
};

export default nextConfig;
