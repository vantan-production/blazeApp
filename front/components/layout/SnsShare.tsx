"use client";

import Image from "next/image";
import { useState } from "react";

const shareTitle = "西尾ブレイズ";

type ShareTarget = {
	label: string;
	icon: string;
	width: number;
	height: number;
	/** 共有用URLを組み立てる。nullならWeb Share API（なければURLコピー）で共有する */
	buildUrl: ((url: string) => string) | null;
};

const shareTargets: ShareTarget[] = [
	{
		// Instagramには外部からURLを投稿させる共有URLが無いため、端末の共有シートを使う
		label: "Instagram",
		icon: "/icons/instagram.svg",
		width: 36,
		height: 36,
		buildUrl: null,
	},
	{
		label: "X",
		icon: "/icons/x.svg",
		width: 36,
		height: 32.6263,
		buildUrl: (url) =>
			`https://x.com/intent/post?${new URLSearchParams({ text: shareTitle, url })}`,
	},
	{
		label: "LINE",
		icon: "/icons/line.svg",
		width: 30,
		height: 30,
		buildUrl: (url) =>
			`https://social-plugins.line.me/lineit/share?${new URLSearchParams({ url })}`,
	},
];

/** 表示中のページを各SNSで他の人に共有するボタン群（Figma: 1700:2724） */
export function SnsShare() {
	const [copied, setCopied] = useState(false);

	const share = async (target: ShareTarget) => {
		const url = window.location.href;
		if (target.buildUrl) {
			window.open(target.buildUrl(url), "_blank", "noopener,noreferrer");
			return;
		}
		if (navigator.share) {
			try {
				await navigator.share({ title: shareTitle, url });
			} catch {
				// ユーザーが共有シートを閉じた場合は何もしない
			}
			return;
		}
		await navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="flex w-[142px] flex-col items-center gap-2">
			<p className="w-full text-center font-inter text-[12px] text-white">
				SHARE
			</p>
			<ul className="flex w-full items-center justify-center gap-5">
				{shareTargets.map((target) => (
					<li key={target.label}>
						<button
							type="button"
							onClick={() => share(target)}
							aria-label={`${target.label}で共有`}
							className="flex size-9 cursor-pointer items-center justify-center"
						>
							<Image
								src={target.icon}
								alt=""
								width={target.width}
								height={target.height}
							/>
						</button>
					</li>
				))}
			</ul>
			<p aria-live="polite" className="h-4 text-[11px] text-brand-white">
				{copied ? "URLをコピーしました" : ""}
			</p>
		</div>
	);
}
