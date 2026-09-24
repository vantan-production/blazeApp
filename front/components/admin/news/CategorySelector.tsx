"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { AdminFieldError } from "@/components/admin/AdminTextField";
import type { ApiSuccess } from "@/lib/admin/api";
import { apiClient } from "@/lib/apiClient";
import { categorySchema } from "@/lib/validation/schemas";

// 候補が取れないとき（投稿がまだ無い・通信失敗）の初期候補（Figma の表示どおり）
const DEFAULT_CATEGORIES = ["event", "news"];

type Props = {
	/** 選択中のカテゴリー（未選択は undefined） */
	value: string | undefined;
	onChange: (category: string | undefined) => void;
};

const chipClass =
	"inline-flex h-6 items-center gap-[6px] rounded-[10px] border-[0.3px] border-black px-[6px] text-[12px] leading-[22px] font-medium";

/**
 * ニュースのカテゴリー選択（Figma: Frame 188 2430:1094）。
 * よく使われるカテゴリー（GET /api/news-post/categories）から1つ選ぶか、「カテゴリーを追加」で新しく入力する。
 */
export function CategorySelector({ value, onChange }: Props) {
	const inputId = useId();
	const [options, setOptions] = useState<string[]>(DEFAULT_CATEGORIES);
	const [adding, setAdding] = useState(false);
	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		apiClient<ApiSuccess<{ category: string; count: number }[]>>(
			"/api/news-post/categories",
		)
			.then((res) => {
				if (res.data.length > 0) setOptions(res.data.map((r) => r.category));
			})
			.catch(() => {
				// 候補が取れなくても初期候補で入力できるので何もしない
			});
	}, []);

	const addCategory = () => {
		const result = categorySchema.safeParse(draft);
		if (!result.success) {
			setError(result.error.issues[0]?.message ?? "カテゴリーが不正です。");
			return;
		}
		const category = result.data;
		setOptions((prev) =>
			prev.includes(category) ? prev : [...prev, category],
		);
		onChange(category);
		setDraft("");
		setError(null);
		setAdding(false);
	};

	return (
		<fieldset className="flex w-full flex-col gap-[2px]">
			<legend className="mb-[2px] text-[12px] leading-[22px] font-medium text-brand-white">
				カテゴリー
			</legend>
			<div className="flex flex-wrap items-start gap-[2px]">
				{options.map((option) => {
					const selected = option === value;
					return (
						<button
							key={option}
							type="button"
							aria-pressed={selected}
							onClick={() => onChange(selected ? undefined : option)}
							className={`${chipClass} ${selected ? "bg-brand-yellow" : "bg-brand-white"} text-brand-black`}
						>
							<Image
								src="/icons/admin/plus-small.svg"
								alt=""
								width={12}
								height={12}
								className={selected ? "rotate-45" : ""}
							/>
							{option}
						</button>
					);
				})}
				{!adding && (
					<button
						type="button"
						onClick={() => setAdding(true)}
						className={`${chipClass} bg-[#c3c3c3] text-brand-white`}
					>
						<Image
							src="/icons/admin/plus-small.svg"
							alt=""
							width={12}
							height={12}
						/>
						カテゴリーを追加
					</button>
				)}
			</div>
			{adding && (
				<div className="mt-1 flex items-center gap-1">
					<label htmlFor={inputId} className="sr-only">
						追加するカテゴリー
					</label>
					<input
						id={inputId}
						// biome-ignore lint/a11y/noAutofocus: 「カテゴリーを追加」を押した直後に入力できるようにする
						autoFocus
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							// 日本語変換の確定Enterでは追加しない
							if (event.key === "Enter" && !event.nativeEvent.isComposing) {
								event.preventDefault();
								addCategory();
							}
						}}
						placeholder="カテゴリー名"
						className="h-6 w-40 rounded-[10px] border-[0.3px] border-black bg-brand-white px-2 text-[12px] text-brand-black outline-none placeholder:text-[rgba(80,80,80,0.4)]"
					/>
					<button
						type="button"
						onClick={addCategory}
						className={`${chipClass} bg-brand-white text-brand-black`}
					>
						追加
					</button>
					<button
						type="button"
						onClick={() => {
							setAdding(false);
							setDraft("");
							setError(null);
						}}
						className="text-[12px] text-brand-white underline"
					>
						キャンセル
					</button>
				</div>
			)}
			{error && <AdminFieldError message={error} tone="dark" />}
		</fieldset>
	);
}
