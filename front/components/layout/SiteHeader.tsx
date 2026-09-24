"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { routes } from "@/lib/routes";
import { DrawerMenu } from "./DrawerMenu";

type Props = {
	/** trueのとき背景付き（Figma: header isBg）。falseならスクロール時のみ背景が付く */
	withBackground?: boolean;
};

/**
 * サイト共通ヘッダー（Figma: header 1511:429）。
 * メニューボタンでドロワー（state=selected の×アイコン）を開閉する。
 */
export function SiteHeader({ withBackground = false }: Props) {
	const [isOpen, setIsOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const drawerId = useId();

	useEffect(() => {
		const onScroll = () => setIsScrolled(window.scrollY > 40);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		document.body.style.overflow = isOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	const hasBackground = !isOpen && (withBackground || isScrolled);
	const close = () => setIsOpen(false);

	return (
		<>
			<header className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[402px]">
				<div
					className={`flex items-center justify-between rounded-[1000px] py-4 pr-[25px] pl-[21px] transition-colors ${
						hasBackground ? "bg-[rgba(232,223,67,0.7)]" : ""
					}`}
				>
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
