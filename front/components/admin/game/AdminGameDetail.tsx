"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";
import { type ApiSuccess, toErrorMessage } from "@/lib/admin/api";
import {
	formatGameDate,
	type GameImage,
	type GameImageConsent,
	type GamePost,
	gameConsentLabel,
} from "@/lib/admin/game";
import { adminGameMosaicPath, adminRoutes } from "@/lib/admin/routes";
import { ApiError, apiClient } from "@/lib/apiClient";
import { useToastStore } from "@/lib/store/useToastStore";
import { GameThumbnail } from "./GameThumbnail";

type Props = {
	id: string;
};

/**
 * 投稿済み試合風景の詳細（GET /api/gameImg/:id）。ニュース詳細と同じ並びで日付を出し、
 * 画像を1枚ずつカードで並べ、それぞれに掲載確認（掲載する／しない）とモザイク編集を置く。最後に投稿の削除を置く
 */
export function AdminGameDetail({ id }: Props) {
	const router = useRouter();
	const showToast = useToastStore((state) => state.showToast);
	const [post, setPost] = useState<GamePost | null>(null);
	const [error, setError] = useState<string | null>(null);
	// 掲載状態を更新中の画像ID（二重送信を防ぐ）
	const [updatingImageId, setUpdatingImageId] = useState<string | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<GamePost>>(`/api/gameImg/${id}`)
			.then((res) => {
				if (!ignore) setPost(res.data);
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 404
						? "試合風景が見つかりません。"
						: "試合風景の取得に失敗しました。",
				);
			});
		return () => {
			ignore = true;
		};
	}, [id]);

	const updateConsent = async (
		imageId: string,
		consentStatus: GameImageConsent,
	) => {
		setUpdatingImageId(imageId);
		try {
			await apiClient(`/api/gameImg/images/${imageId}/consent`, {
				method: "PATCH",
				body: JSON.stringify({ consent_status: consentStatus }),
			});
			setPost((prev) =>
				prev
					? {
							...prev,
							images: prev.images.map((image) =>
								image.id === imageId
									? { ...image, consent_status: consentStatus }
									: image,
							),
						}
					: prev,
			);
			showToast(`「${gameConsentLabel[consentStatus]}」にしました。`);
		} catch (err) {
			showToast(toErrorMessage(err, "掲載状態の更新に失敗しました。"), "error");
		} finally {
			setUpdatingImageId(null);
		}
	};

	const deletePost = async () => {
		setDeleting(true);
		try {
			await apiClient(`/api/gameImg/${id}`, { method: "DELETE" });
			showToast("試合風景を削除しました。");
			router.push(adminRoutes.game);
		} catch (err) {
			showToast(toErrorMessage(err, "削除に失敗しました。"), "error");
			setDeleting(false);
			setDeleteOpen(false);
		}
	};

	const closeDelete = useCallback(() => setDeleteOpen(false), []);

	if (error) {
		return <p className="text-[14px] text-brand-white">{error}</p>;
	}

	if (!post) {
		return <p className="text-[14px] text-brand-white">読み込み中…</p>;
	}

	const pendingCount = post.images.filter(
		(image) => image.consent_status === "pending",
	).length;

	return (
		<article className="flex w-full flex-col gap-6 text-brand-white">
			<div className="flex flex-col gap-2 after:h-px after:w-full after:bg-white">
				<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
					{formatGameDate(post.created_at)}
				</time>
				<div className="flex flex-wrap items-center gap-2 pb-2">
					<h2 className="text-[20px] leading-[28px] font-medium tracking-[1px]">
						画像 {post.images.length}枚
					</h2>
					{pendingCount > 0 && (
						<span
							className={`rounded-[200px] px-[10px] text-[12px] leading-[22px] tracking-[1px] ${consentBadgeClass.pending}`}
						>
							{gameConsentLabel.pending} {pendingCount}枚
						</span>
					)}
				</div>
			</div>
			<section aria-label="掲載の確認" className="flex flex-col gap-4">
				<p className="text-[13px] leading-[20px] tracking-[1px] opacity-80">
					「掲載する」にした画像だけが公開サイトに表示されます。顔を出せない人が写っている場合は、モザイクをかけてから掲載してください。
				</p>
				<ul className="flex flex-col gap-5">
					{post.images.map((image, index) => (
						<GameImageCard
							key={image.id}
							image={image}
							// 先頭の1枚がサムネイル（投稿フォームで先頭に送っている）、残りが記事内の画像
							label={index === 0 ? "サムネイル" : `記事内の画像 ${index}`}
							mosaicHref={adminGameMosaicPath(post.id, image.id)}
							updating={updatingImageId === image.id}
							onChangeConsent={(status) => updateConsent(image.id, status)}
						/>
					))}
				</ul>
			</section>
			<div className="mt-6 flex flex-col items-center gap-2 border-t border-white/30 pt-6">
				<button
					type="button"
					onClick={() => setDeleteOpen(true)}
					className="flex h-10 items-center gap-2 rounded-[10px] px-4 text-[15px] leading-[22px] tracking-[1px] text-[#ff8a8d] ring-1 ring-[#ff8a8d]/70 transition-opacity hover:opacity-80"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
						className="size-[18px]"
					>
						<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
					</svg>
					この投稿を削除
				</button>
			</div>
			<AdminActionDialog
				open={deleteOpen}
				tone="danger"
				title="この投稿を削除しますか？"
				description={`画像${post.images.length}枚がすべて削除され、公開サイトからも見えなくなります。この操作は取り消せません。`}
				imageUrl={post.images[0]?.url}
				confirmLabel="削除する"
				onConfirm={deletePost}
				onCancel={closeDelete}
				pending={deleting}
			/>
		</article>
	);
}

/** 掲載状態の印の色。確認待ち: 黄 / 掲載OK: 緑 / 掲載NG: 赤 */
const consentBadgeClass: Record<GameImageConsent, string> = {
	pending: "bg-[#ffe7a3] text-[#7a5200]",
	approved: "bg-[#d1f0ae] text-[#1f6b00]",
	rejected: "bg-[#ffd6d6] text-[#b00003]",
};

type GameImageCardProps = {
	image: GameImage;
	/** サムネイル／記事内の画像 n */
	label: string;
	mosaicHref: string;
	updating: boolean;
	onChangeConsent: (status: GameImageConsent) => void;
};

const consentOptions = [
	{ value: "approved", label: "掲載する" },
	{ value: "rejected", label: "掲載しない" },
] as const;

/**
 * 画像1枚ぶんの掲載確認。顔が確認できるよう画像を横幅いっぱいに出し、
 * 下に「掲載する／掲載しない」の切り替えとモザイク編集を置く
 */
function GameImageCard({
	image,
	label,
	mosaicHref,
	updating,
	onChangeConsent,
}: GameImageCardProps) {
	const status = image.consent_status;
	return (
		<li className="flex flex-col gap-3 rounded-[14px] bg-white/10 p-3">
			<div className="relative">
				<a
					href={image.url}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={`${label}を開く`}
					className="block transition-opacity hover:opacity-90"
				>
					<GameThumbnail
						url={image.url}
						className="aspect-[4/3] w-full rounded-[10px]"
					/>
				</a>
				<div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
					<span className="rounded-[200px] bg-black/55 px-[10px] text-[12px] leading-[22px] tracking-[1px] text-white">
						{label}
					</span>
					<div className="flex flex-col items-end gap-1">
						{status && (
							<span
								className={`rounded-[200px] px-[10px] text-[12px] leading-[22px] font-medium tracking-[1px] ${consentBadgeClass[status]}`}
							>
								{gameConsentLabel[status]}
							</span>
						)}
						{image.is_original && (
							// 管理者には原本を見せているため、モザイクが公開用にだけかかっていることを示す
							<span className="rounded-[200px] bg-black/55 px-[10px] text-[12px] leading-[22px] tracking-[1px] text-white">
								モザイクあり
							</span>
						)}
					</div>
				</div>
			</div>
			<fieldset
				disabled={updating}
				className="grid grid-cols-2 gap-1 rounded-[10px] bg-black/25 p-1"
			>
				<legend className="sr-only">{label}を掲載するか</legend>
				{consentOptions.map((option) => {
					const selected = status === option.value;
					return (
						<button
							key={option.value}
							type="button"
							aria-pressed={selected}
							onClick={() => {
								if (!selected) onChangeConsent(option.value);
							}}
							className={`flex h-10 items-center justify-center gap-1 rounded-[8px] text-[14px] leading-[22px] font-medium tracking-[1px] transition-colors disabled:opacity-50 ${selected ? "bg-brand-white text-brand-blue shadow-[0px_2px_4px_rgba(0,0,0,0.25)]" : "text-brand-white hover:bg-white/10"}`}
						>
							{selected && (
								<svg
									aria-hidden="true"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth={3}
									strokeLinecap="round"
									strokeLinejoin="round"
									className="size-4"
								>
									<path d="M5 12l5 5L20 7" />
								</svg>
							)}
							{option.label}
						</button>
					);
				})}
			</fieldset>
			<Link
				href={mosaicHref}
				className="flex h-10 items-center justify-center gap-2 rounded-[10px] text-[14px] leading-[22px] tracking-[1px] text-brand-white ring-1 ring-white/50 transition-opacity hover:opacity-80"
			>
				<svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="currentColor"
					className="size-[18px]"
				>
					<path d="M3 3h6v6H3zM15 3h6v6h-6zM9 9h6v6H9zM3 15h6v6H3zM15 15h6v6h-6z" />
				</svg>
				{image.is_original ? "モザイクを編集" : "モザイクをかける"}
			</Link>
		</li>
	);
}
