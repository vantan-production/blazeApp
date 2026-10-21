"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { AdminFieldError } from "./AdminTextField";

type Props = {
	/** 未選択時に中央に出す文言（例: アイキャッチ画像を選択） */
	placeholder: string;
	/** 選択中のファイル */
	files: File[];
	onChange: (files: File[]) => void;
	/** input の accept 属性（例: image/*） */
	accept?: string;
	multiple?: boolean;
	/** 枠の高さ（Figma: アイキャッチ 90px / 試合風景 200px） */
	height?: 90 | 200;
	error?: string;
	name?: string;
	/** 外部の <label htmlFor> から選択ダイアログを開きたい場合に指定する */
	id?: string;
};

/**
 * 白枠のファイル選択エリア（Figma: アイキャッチ画像を選択 2030:1588 / 画像をアップロード 2034:1674）。
 * 画像を選んだ場合はプレビュー、それ以外はファイル名を表示する。
 */
export function AdminFilePicker({
	placeholder,
	files,
	onChange,
	accept,
	multiple = false,
	height = 90,
	error,
	name,
	id: idProp,
}: Props) {
	const generatedId = useId();
	const id = idProp ?? generatedId;
	const inputRef = useRef<HTMLInputElement>(null);

	// 画像ファイルのプレビューURL（アンマウント時・選び直し時に解放する）
	const previews = useMemo(
		() =>
			files
				.filter((file) => file.type.startsWith("image/"))
				.map((file, index) => ({
					// 同名ファイルを複数選んでも key が重複しないよう番号を付ける
					key: `${index}-${file.name}`,
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

	// 選択を解除したら input の値も空にし、同じファイルを選び直せるようにする
	useEffect(() => {
		if (files.length === 0 && inputRef.current) inputRef.current.value = "";
	}, [files]);

	const hasFiles = files.length > 0;

	return (
		<div className="flex w-full flex-col">
			<label
				htmlFor={id}
				className={`relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border-[0.3px] border-black bg-brand-white text-[12px] leading-[22px] font-medium focus-within:ring-1 focus-within:ring-brand-blue ${height === 200 ? "h-[200px]" : "h-[90px]"}`}
			>
				{!hasFiles && (
					<span className="text-[rgba(80,80,80,0.4)]">{placeholder}</span>
				)}
				{hasFiles && previews.length > 0 && (
					<span className="flex h-full w-full gap-1 overflow-x-auto p-1">
						{previews.map((preview) => (
							// biome-ignore lint/performance/noImgElement: ローカルのblob URLはnext/imageで最適化できない
							<img
								key={preview.key}
								src={preview.url}
								alt=""
								className="h-full flex-1 rounded-[8px] object-cover"
							/>
						))}
					</span>
				)}
				{hasFiles && previews.length === 0 && (
					<span className="px-3 text-center break-all text-brand-black">
						{files.map((file) => file.name).join("、")}
					</span>
				)}
				<input
					ref={inputRef}
					id={id}
					name={name}
					type="file"
					accept={accept}
					multiple={multiple}
					aria-label={placeholder}
					className="sr-only"
					onChange={(event) =>
						onChange(Array.from(event.currentTarget.files ?? []))
					}
				/>
			</label>
			{hasFiles && (
				<button
					type="button"
					onClick={() => onChange([])}
					className="mt-1 self-end text-[12px] leading-[22px] text-brand-white underline"
				>
					選択を解除
				</button>
			)}
			{error && <AdminFieldError message={error} tone="dark" />}
		</div>
	);
}
