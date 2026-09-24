"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { routes } from "@/lib/routes";
import { DrawerMenu } from "./DrawerMenu";

/**
 * サイト共通ヘッダー（Figma: header 1511:429）。
 * メニューボタンでドロワー（state=selected の×アイコン）を開閉する。
 */
export function SiteHeader() {
	const [isOpen, setIsOpen] = useState(false);
	const drawerId = useId();

	useEffect(() => {
		document.body.style.overflow = isOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	const close = () => setIsOpen(false);

	return (
		<>
			<header className="fixed inset-x-0 top-0 z-50 mx-auto w-full max-w-[402px]">
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
