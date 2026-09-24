"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SESSION_KEY = "nishio-blaze:splash-shown";

type Phase = "visible" | "fading" | "hidden";

/** このセッションで表示済みか（ストレージが使えない環境では毎回表示する） */
function isShownInSession() {
	try {
		return sessionStorage.getItem(SESSION_KEY) !== null;
	} catch {
		return false;
	}
}

function markShownInSession() {
	try {
		sessionStorage.setItem(SESSION_KEY, "1");
	} catch {
		// 記録できなくても表示には影響しない
	}
}

type Props = {
	/** 表示し続ける時間（ミリ秒）。経過後にフェードアウトする */
	durationMs?: number;
	/** フェードアウトにかける時間（ミリ秒） */
	fadeMs?: number;
	/** trueならタブを開いている間（sessionStorage）で1回だけ表示する */
	oncePerSession?: boolean;
};

/**
 * アプリ起動時のスプラッシュ画面（Figma: splash-screen 282:307）。
 * ボール型に切り抜いたチーム写真に、薄いロゴとボールの縫い目を重ねる。
 * 一定時間後にフェードアウトし、タップするとすぐに閉じる。
 */
export function SplashScreen({
	durationMs = 2000,
	fadeMs = 600,
	oncePerSession = true,
}: Props) {
	// SSR時点で表示しておき、ページ本体が一瞬見えてしまうのを防ぐ
	const [phase, setPhase] = useState<Phase>("visible");

	useEffect(() => {
		const alreadyShown = oncePerSession && isShownInSession();
		// 表示済みならすぐ消し、未表示なら一定時間後にフェードアウトを始める
		const timer = setTimeout(
			() => setPhase(alreadyShown ? "hidden" : "fading"),
			alreadyShown ? 0 : durationMs,
		);
		return () => clearTimeout(timer);
	}, [durationMs, oncePerSession]);

	useEffect(() => {
		if (phase !== "fading") return;
		// 表示し終えた時点で記録する（StrictModeでエフェクトが2回走っても消えないように）
		markShownInSession();
		const timer = setTimeout(() => setPhase("hidden"), fadeMs);
		return () => clearTimeout(timer);
	}, [phase, fadeMs]);

	if (phase === "hidden") return null;

	return (
		<button
			type="button"
			onClick={() => setPhase("fading")}
			aria-label="スプラッシュ画面を閉じる"
			className={`fixed inset-0 z-[100] flex cursor-pointer items-center justify-center overflow-hidden bg-brand-blue transition-opacity motion-reduce:transition-none ${
				phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100"
			}`}
			style={{ transitionDuration: `${fadeMs}ms` }}
		>
			{/* デザインはSP幅（402px）前提のため、サイト本体と同じ幅の列に収めて切り抜く */}
			<span className="relative flex h-full w-full max-w-[402px] items-center justify-center overflow-hidden">
				{/* ボール型に切り抜いたチーム写真（Figma: bg 385:740） */}
				<span className="relative h-[712px] w-[713px] shrink-0 overflow-hidden rounded-[340px]">
					<Image
						src="/images/splash-team.jpg"
						alt=""
						width={2500}
						height={744}
						sizes="1970px"
						preload
						className="absolute top-[-0.84%] left-[21.63%] h-full w-[276.05%] max-w-none"
					/>
				</span>

				{/* 薄く敷いたロゴと全体の暗幕（Figma: group02 385:741） */}
				<span
					aria-hidden
					className="pointer-events-none absolute top-1/2 left-1/2 h-[874px] w-[402px] -translate-1/2 overflow-hidden opacity-10"
				>
					<Image
						src="/images/splash-logo.jpg"
						alt=""
						width={320}
						height={320}
						className="absolute top-[0.32%] left-0 h-[99.28%] w-full max-w-none"
					/>
				</span>
				<span aria-hidden className="absolute inset-0 bg-black/20" />

				{/* ボールの縫い目（Figma: Vector 2 385:742） */}
				<Image
					src="/images/splash-ball-lines.svg"
					alt=""
					width={713.057}
					height={712}
					className="absolute top-1/2 left-1/2 max-w-none -translate-1/2"
				/>
			</span>
		</button>
	);
}
