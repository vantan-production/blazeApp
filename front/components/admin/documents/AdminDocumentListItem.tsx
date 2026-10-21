"use client";

import {
	type AdminDocument,
	displayFileName,
	formatDocumentDate,
	type SavedDocument,
} from "@/lib/admin/documents";
import { DocumentForm } from "./DocumentForm";

type Props = {
	document: AdminDocument;
	/** この行の編集フォームを開いているか */
	editing: boolean;
	/** ダウンロードURLを取得中か */
	downloading: boolean;
	onDownload: () => void;
	onEdit: () => void;
	onCancelEdit: () => void;
	onSaved: (saved: SavedDocument, replacedFile: File | null) => void;
	onDelete: () => void;
};

const actionClass =
	"flex h-8 items-center justify-center gap-1 rounded-full px-4 text-[14px] leading-[22px] tracking-[1px] shadow-[0px_2px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-80 disabled:opacity-50";

/**
 * 資料1件の行。登録日・分類タグ・タイトル・ファイル名・説明を出し、
 * 下に「開く」「編集」「削除」を並べる。編集を押すとその場でフォームに切り替わる
 */
export function AdminDocumentListItem({
	document,
	editing,
	downloading,
	onDownload,
	onEdit,
	onCancelEdit,
	onSaved,
	onDelete,
}: Props) {
	if (editing) {
		return (
			<li className="flex flex-col gap-4 rounded-[14px] bg-white/10 p-3">
				<p className="text-[14px] leading-[22px] font-medium tracking-[1px]">
					資料を編集
				</p>
				<DocumentForm
					document={document}
					onSaved={onSaved}
					onCancel={onCancelEdit}
				/>
			</li>
		);
	}

	return (
		<li className="flex flex-col gap-2 after:mt-4 after:h-px after:w-full after:bg-white">
			<div className="flex flex-wrap items-center gap-2">
				<time className="px-[2px] text-[14px] leading-[22px] tracking-[1px]">
					{formatDocumentDate(document.created_at)}
				</time>
				{document.category && (
					// ニュースのカテゴリータグと同じ形
					<span className="rounded-[200px] bg-white px-[10px] text-[12px] leading-[22px] tracking-[1px] text-brand-blue">
						{document.category}
					</span>
				)}
			</div>
			<p className="text-[18px] leading-[24px] tracking-[1px] break-all">
				{document.title}
			</p>
			<p className="flex items-center gap-1 text-[12px] leading-[18px] tracking-[0.5px] break-all opacity-80">
				<svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					className="size-4 shrink-0"
				>
					<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
					<path d="M14 3v5h5" />
				</svg>
				{document.file_name
					? displayFileName(document.file_name)
					: "ファイルがありません"}
			</p>
			{document.description && (
				<p className="line-clamp-3 text-[13px] leading-[20px] tracking-[0.5px] whitespace-pre-wrap break-all">
					{document.description}
				</p>
			)}
			<p className="text-[12px] leading-[18px] tracking-[0.5px] opacity-70">
				登録: {document.admin_name}
			</p>
			<div className="mt-1 flex flex-wrap gap-2">
				<button
					type="button"
					onClick={onDownload}
					disabled={!document.has_file || downloading}
					className={`${actionClass} bg-brand-white text-brand-blue`}
				>
					{downloading ? "準備中…" : "開く"}
				</button>
				<button
					type="button"
					onClick={onEdit}
					className={`${actionClass} bg-brand-blue text-brand-white ring-1 ring-white/60`}
				>
					編集
				</button>
				<button
					type="button"
					onClick={onDelete}
					className={`${actionClass} bg-brand-blue text-[#ff8a8d] ring-1 ring-[#ff8a8d]/70`}
				>
					削除
				</button>
			</div>
		</li>
	);
}
