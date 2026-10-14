"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { HERO_SECTION_ID } from "@/components/top/HeroSection";
import { routes } from "@/lib/routes";
import { DrawerMenu } from "./DrawerMenu";

/** ヘッダーの高さ（ロゴ64px＋上下の余白）。ファーストビューがこの下まで流れたら体験ボタンを出す */
const HEADER_HEIGHT = 96;

/**
 * トップページで、ファーストビューがヘッダーの下まで流れたら true。
 * 他のページ（ファーストビューが無い）では常に false
 */
function usePastHero(enabled: boolean): boolean {
	const [isPast, setIsPast] = useState(false);

	useEffect(() => {
		const hero = enabled ? document.getElementById(HERO_SECTION_ID) : null;
		if (!hero) return;
		const observer = new IntersectionObserver(
			(entries) => {
				// まとめて届いたときは古い順に並ぶので、最後のものが今の状態
				const latest = entries[entries.length - 1];
				setIsPast(!latest.isIntersecting);
			},
			{ rootMargin: `-${HEADER_HEIGHT}px 0px 0px 0px` },
		);
		observer.observe(hero);
		return () => {
			observer.disconnect();
			// トップへ戻ってきたとき、前回の値で一瞬ボタンが出ないようにする
			setIsPast(false);
		};
	}, [enabled]);

	// トップ以外では、前の値が残っていても出さない
	return enabled && isPast;
}

/**
 * サイト共通ヘッダー（Figma: header 1511:429）。
 * メニューボタンでドロワー（state=selected の×アイコン）を開閉する。
 * トップページではファーストビューを過ぎると、ロゴとメニューの間に体験フォームへのボタンを出す。
 */
export function SiteHeader() {
	const [isOpen, setIsOpen] = useState(false);
	const drawerId = useId();
	const pathname = usePathname();
	const isPastHero = usePastHero(pathname === routes.top);
	// ドロワーには体験バナーがあるため、開いている間は出さない
	const showTrial = isPastHero && !isOpen;

	useEffect(() => {
		document.body.style.overflow = isOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	const close = () => setIsOpen(false);

	return (
		<>
			<header className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-sp">
				<div className="flex items-center justify-between py-4 pr-[25px] pl-[21px]">
					<Link
						href={routes.top}
						onClick={close}
						aria-label="西尾ブレイズ トップへ"
					>
						<Image
							src="/images/logo.png"
							alt="西尾ブレイズ"
							width={109}
							height={64}
							preload
						/>
					</Link>
					<Link
						href={routes.trial}
						inert={!showTrial}
						aria-hidden={!showTrial}
						className={`flex h-10 items-center justify-center rounded-[1000px] bg-brand-yellow px-3 text-[14px] font-medium tracking-[1px] whitespace-nowrap text-brand-blue shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-[opacity,translate] duration-300 ${
							showTrial
								? "translate-y-0 opacity-100"
								: "pointer-events-none -translate-y-2 opacity-0"
						}`}
					>
						体験はこちら
					</Link>
					<button
						type="button"
						onClick={() => setIsOpen((open) => !open)}
						aria-expanded={isOpen}
						aria-controls={drawerId}
						aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"}
						className="size-11 cursor-pointer md:fixed md:top-[50px] md:right-[50px]"
					>
						<Image
							src={isOpen ? "/icons/close.svg" : "/icons/menu.svg"}
							alt=""
							width={44}
							height={44}
						/>
					</button>
				</div>
			</header>
			{isOpen && <DrawerMenu id={drawerId} onNavigate={close} />}
		</>
	);
}
