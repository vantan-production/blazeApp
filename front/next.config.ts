import path from "node:path";
import type { NextConfig } from "next";

// 画像の最適化を許可するS3バケット名（backと同じ AWS_S3_BUCKET）。ビルド時に読まれるため、
// Vercel等のビルド環境にも設定が必要。未設定ならS3画像は最適化対象にしない
const s3Bucket = process.env.AWS_S3_BUCKET;

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
		// 他人のバケットの画像まで最適化させないよう、ホストはアプリのバケットに限定する
		remotePatterns: s3Bucket
			? [
					{
						protocol: "https",
						hostname: `${s3Bucket}.s3.ap-northeast-1.amazonaws.com`,
						pathname: "/**",
					},
				]
			: [],
	},
	experimental: {
		// app/unauthorized.tsx（401ページ）を unauthorized() で表示するために必要
		authInterrupts: true,
	},
};

export default nextConfig;
