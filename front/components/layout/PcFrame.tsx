import Image from "next/image";

/**
 * PCで開いたときにSP幅（402px）のページの左右に敷く背景（Figma: pc-screen 1844:1107）。
 * クリーム色の上に選手写真を薄く重ね、ぼかしをかける。md未満では表示しない。
 */
export function PcFrame() {
	return (
		<div
			aria-hidden
			className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden bg-[#f7f0df] md:block"
		>
			{/* ぼかしで端が透けないよう、ぼかし幅分だけ外側に広げる */}
			<div className="absolute -inset-2 blur-[4px]">
				<Image
					src="/images/pc-background.jpg"
					alt=""
					fill
					sizes="100vw"
					className="object-cover opacity-[0.21]"
				/>
			</div>
		</div>
	);
}
