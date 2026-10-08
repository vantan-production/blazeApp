"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminFieldError } from "@/components/admin/AdminTextField";
import { type ApiSuccess, toErrorMessage } from "@/lib/admin/api";
import {
	GAME_MOSAIC_MAX_REGIONS,
	type GameMosaic,
	type GameMosaicRegion,
} from "@/lib/admin/game";
import { adminGameDetailPath } from "@/lib/admin/routes";
import { ApiError, apiClient } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";

type Props = {
	gameId: string;
	imageId: string;
};

// これより小さい範囲（画面上のpx）は、タップしただけとみなして追加しない
const MIN_DRAG_PX = 8;

type Point = { x: number; y: number };

/**
 * 試合風景の画像1枚のモザイク編集（GET/POST/DELETE /api/gameImg/images/:imageId/mosaic）。
 * 原本の上をなぞって範囲を追加し、保存すると back が原本から公開用の画像を作り直す。
 * 範囲は元画像のピクセル座標で持ち、表示の縮尺に合わせて重ねる
 */
export function GameMosaicEditor({ gameId, imageId }: Props) {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const imageRef = useRef<HTMLImageElement>(null);
	const [mosaic, setMosaic] = useState<GameMosaic | null>(null);
	const [regions, setRegions] = useState<GameMosaicRegion[]>([]);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	// 表示サイズ ÷ 元画像のサイズ。画像の読み込み後と画面幅が変わったときに測り直す
	const [scale, setScale] = useState(0);
	const [dragStart, setDragStart] = useState<Point | null>(null);
	const [dragEnd, setDragEnd] = useState<Point | null>(null);
	const [saving, setSaving] = useState(false);
	const [removeOpen, setRemoveOpen] = useState(false);

	const detailHref = adminGameDetailPath(gameId);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<GameMosaic>>(`/api/gameImg/images/${imageId}/mosaic`)
			.then((res) => {
				if (ignore) return;
				setMosaic(res.data);
				setRegions(res.data.mosaic_regions);
			})
			.catch((err) => {
				if (ignore) return;
				setLoadError(
					err instanceof ApiError && err.status === 404
						? "画像が見つかりません。"
						: "画像の取得に失敗しました。",
				);
			});
		return () => {
			ignore = true;
		};
	}, [imageId]);

	const measure = useCallback(() => {
		const image = imageRef.current;
		if (!image?.naturalWidth) return;
		setScale(image.clientWidth / image.naturalWidth);
	}, []);

	useEffect(() => {
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, [measure]);

	/** 画像の左上を原点にした、画面上の座標 */
	const pointFromEvent = (event: React.PointerEvent): Point => {
		const rect = event.currentTarget.getBoundingClientRect();
		return {
			x: Math.min(Math.max(event.clientX - rect.left, 0), rect.width),
			y: Math.min(Math.max(event.clientY - rect.top, 0), rect.height),
		};
	};

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!scale || regions.length >= GAME_MOSAIC_MAX_REGIONS) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		const point = pointFromEvent(event);
		setDragStart(point);
		setDragEnd(point);
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!dragStart) return;
		setDragEnd(pointFromEvent(event));
	};

	const handlePointerUp = () => {
		if (dragStart && dragEnd && scale) {
			const left = Math.min(dragStart.x, dragEnd.x);
			const top = Math.min(dragStart.y, dragEnd.y);
			const width = Math.abs(dragEnd.x - dragStart.x);
			const height = Math.abs(dragEnd.y - dragStart.y);
			const image = imageRef.current;
			if (image && width >= MIN_DRAG_PX && height >= MIN_DRAG_PX) {
				// 元画像のピクセル座標に直し、はみ出さないように丸める（back は画像外の範囲を400にする）
				const x = Math.floor(left / scale);
				const y = Math.floor(top / scale);
				setRegions((prev) => [
					...prev,
					{
						x,
						y,
						width: Math.max(
							1,
							Math.min(Math.round(width / scale), image.naturalWidth - x),
						),
						height: Math.max(
							1,
							Math.min(Math.round(height / scale), image.naturalHeight - y),
						),
					},
				]);
				setSubmitError(null);
			}
		}
		setDragStart(null);
		setDragEnd(null);
	};

	const save = async () => {
		setSaving(true);
		setSubmitError(null);
		try {
			if (regions.length > 0) {
				await apiClient(`/api/gameImg/images/${imageId}/mosaic`, {
					method: "POST",
					body: JSON.stringify({ regions }),
				});
				showToast("モザイクを保存しました。");
			} else {
				// 範囲をすべて消して保存したときは解除と同じ
				await apiClient(`/api/gameImg/images/${imageId}/mosaic`, {
					method: "DELETE",
				});
				showToast("モザイクを解除しました。");
			}
			router.push(detailHref);
		} catch (err) {
			setSubmitError(toErrorMessage(err, "モザイクの保存に失敗しました。"));
			setSaving(false);
		}
	};

	const remove = async () => {
		setSaving(true);
		try {
			await apiClient(`/api/gameImg/images/${imageId}/mosaic`, {
				method: "DELETE",
			});
			showToast("モザイクを解除しました。");
			router.push(detailHref);
		} catch (err) {
			setSubmitError(toErrorMessage(err, "モザイクの解除に失敗しました。"));
			setSaving(false);
			setRemoveOpen(false);
		}
	};

	const closeRemove = useCallback(() => setRemoveOpen(false), []);

	if (loadError) {
		return <p className="text-[14px] text-brand-white">{loadError}</p>;
	}

	if (!mosaic) {
		return <p className="text-[14px] text-brand-white">読み込み中…</p>;
	}

	const draft =
		dragStart && dragEnd
			? {
					left: Math.min(dragStart.x, dragEnd.x),
					top: Math.min(dragStart.y, dragEnd.y),
					width: Math.abs(dragEnd.x - dragStart.x),
					height: Math.abs(dragEnd.y - dragStart.y),
				}
			: null;
	// 保存済みの状態から変わっていなければ保存ボタンを押せなくする
	const unchanged =
		JSON.stringify(regions) === JSON.stringify(mosaic.mosaic_regions);

	return (
		<div className="flex w-full flex-1 flex-col justify-between gap-12 text-brand-white">
			<div className="flex w-full flex-col gap-4">
				<p className="text-[12px] leading-[18px] tracking-[1px] opacity-80">
					隠したい顔の上をなぞって範囲を追加します（最大
					{GAME_MOSAIC_MAX_REGIONS}
					か所）。範囲の ×
					で取り消せます。保存すると公開サイトの画像に反映されます。
				</p>
				{/* なぞる操作をスクロールと取り合わないよう touch-none にする */}
				<div
					className="relative touch-none select-none overflow-hidden rounded-[12px] bg-white/20"
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerCancel={handlePointerUp}
				>
					{/* biome-ignore lint/performance/noImgElement: S3の署名付きURLは期限付きで next/image の最適化対象にしない */}
					<img
						ref={imageRef}
						src={mosaic.original_url}
						alt="モザイクをかける画像（原本）"
						draggable={false}
						onLoad={measure}
						className="block h-auto w-full"
					/>
					{scale > 0 &&
						regions.map((region, index) => (
							<div
								// 範囲は並び順で区別する（同じ座標の範囲を2つ置いても困らない）
								// biome-ignore lint/suspicious/noArrayIndexKey: 範囲にIDは無く、並び順そのものが識別子
								key={index}
								className="absolute bg-white/10 ring-2 ring-white backdrop-blur-md"
								style={{
									left: region.x * scale,
									top: region.y * scale,
									width: region.width * scale,
									height: region.height * scale,
								}}
							>
								<button
									type="button"
									aria-label={`範囲 ${index + 1} を取り消す`}
									onPointerDown={(event) => event.stopPropagation()}
									onClick={() => {
										setRegions((prev) => prev.filter((_, i) => i !== index));
										setSubmitError(null);
									}}
									className="absolute -top-3 -right-3 flex size-6 items-center justify-center rounded-full bg-brand-white text-[14px] leading-none text-brand-blue shadow-[0px_2px_4px_rgba(0,0,0,0.25)]"
								>
									×
								</button>
							</div>
						))}
					{draft && (
						<div
							className="pointer-events-none absolute border-2 border-dashed border-white bg-white/20"
							style={draft}
						/>
					)}
				</div>
				<p className="text-[14px] leading-[22px] tracking-[1px]">
					範囲 {regions.length}か所
					{mosaic.has_mosaic && "（モザイク適用中）"}
				</p>
				{mosaic.has_mosaic && (
					<button
						type="button"
						onClick={() => setRemoveOpen(true)}
						disabled={saving}
						className="self-start text-[14px] leading-[22px] tracking-[1px] underline disabled:opacity-50"
					>
						モザイクを解除して原本に戻す
					</button>
				)}
			</div>
			<div className="flex w-full flex-col items-center gap-2">
				{submitError && <AdminFieldError message={submitError} tone="dark" />}
				<AdminButton
					variant="light"
					onClick={save}
					disabled={saving || unchanged}
				>
					{saving ? "保存中…" : "保存"}
				</AdminButton>
			</div>
			<AdminActionDialog
				open={removeOpen}
				title="モザイクを解除しますか？"
				description="公開サイトの画像が原本（モザイクなし）に戻ります。"
				imageUrl={mosaic.original_url}
				confirmLabel="解除する"
				onConfirm={remove}
				onCancel={closeRemove}
				pending={saving}
			/>
		</div>
	);
}
