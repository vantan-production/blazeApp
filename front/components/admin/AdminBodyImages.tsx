"use client";

import { useEffect, useMemo } from "react";

type Props = {
	/** 本文欄右下の画像追加アイコン（<label htmlFor>）から選択ダイアログを開くための id */
	id: string;
	/** 選択中の本文の画像 */
	files: File[];
	onChange: (files: File[]) => void;
	/** input の accept 属性（例: image/*） */
	accept?: string;
	/** 選べる最大枚数。超えた分は追加しない */
	max: number;
	/** 上限を超えて選ばれたときに onChange の後で呼ぶ */
	onOverflow?: () => void;
	/** 選んだ画像の上に出す見出し（枚数の前に付く） */
	label?: string;
};

/**
 * 本文に載せる画像の選択欄。input は隠し、本文欄のアイコンから開く。
 * 選んだ画像は小さなサムネイルで並べ、1枚ずつ外せるようにする。選び直しではなく追加していく。
 */
export function AdminBodyImages({
	id,
	files,
	onChange,
	accept,
	max,
	onOverflow,
	label = "本文の画像",
}: Props) {
	// プレビューURL（アンマウント時・選び直し時に解放する）
	const previews = useMemo(
		() =>
			files.map((file, index) => ({
				// 同名ファイルを複数選んでも key が重複しないよう番号を付ける
				key: `${index}-${file.name}`,
				name: file.name,
				url: URL.createObjectURL(file),
			})),
		[files],
	);
	useEffect(
		() => () => {
			for (const preview of previews) URL.revokeObjectURL(preview.url);
		},
		[previews],
	);

	const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selected = Array.from(event.currentTarget.files ?? []);
		// 同じファイルをもう一度選べるよう、毎回 input を空に戻す
		event.currentTarget.value = "";
		if (selected.length === 0) return;

		const next = [...files, ...selected];
		onChange(next.slice(0, max));
		// onChange の後に呼び、呼び出し側が onChange でエラーを消しても上限エラーが残るようにする
		if (next.length > max) onOverflow?.();
	};

	const removeAt = (index: number) => {
		onChange(files.filter((_, i) => i !== index));
	};

	return (
		// 未選択のときは sr-only の input だけになり、フォームの縦の間隔を増やさない
		<>
			<input
				id={id}
				type="file"
				accept={accept}
				multiple
				aria-label="本文に画像を追加"
				className="sr-only"
				onChange={handleSelect}
			/>
			{previews.length > 0 && (
				<div className="flex w-full flex-col gap-1">
					<p className="text-[12px] leading-[18px] text-brand-white">
						{label}（{previews.length}/{max}枚）
					</p>
					<ul className="flex gap-2 overflow-x-auto pt-2 pr-2 pb-1">
						{previews.map((preview, index) => (
							<li key={preview.key} className="relative shrink-0">
								{/* biome-ignore lint/performance/noImgElement: ローカルのblob URLはnext/imageで最適化できない */}
								<img
									src={preview.url}
									alt={preview.name}
									className="size-16 rounded-[8px] bg-brand-white object-cover"
								/>
								<button
									type="button"
									onClick={() => removeAt(index)}
									aria-label={`${preview.name} を外す`}
									className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border-2 border-brand-blue bg-brand-white text-brand-blue"
								>
									<svg
										aria-hidden="true"
										viewBox="0 0 12 12"
										fill="none"
										stroke="currentColor"
										strokeWidth={2}
										strokeLinecap="round"
										className="size-[10px]"
									>
										<path d="M3 3l6 6M9 3l-6 6" />
									</svg>
								</button>
							</li>
						))}
					</ul>
				</div>
			)}
		</>
	);
}
