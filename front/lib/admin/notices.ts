// 関係者向けお知らせ（管理側）の型と、画面表示用の小さな変換。
// API: back/src/notice/*（news テーブルの type='notice' を使う）。レスポンスの形は
// back/src/notice/getAll.ts・getReadStatus.ts と back/src/news/getById.ts に合わせている。

import { z } from "zod";
import {
	bodySchema,
	categorySchema,
	titleSchema,
} from "@/lib/validation/schemas";

/**
 * 公開範囲（news.visibility）。public = 誰でも見られる / member = ログインした関係者だけ。
 * お知らせは back が常に member で作成し、編集でも変えられない（back/src/news/create.ts・update.ts）
 */
export type NoticeVisibility = "public" | "member";

export const noticeVisibilityLabel: Record<NoticeVisibility, string> = {
	public: "誰でも見られる",
	member: "関係者限定",
};

/** 公開状態（news.status）。管理者が投稿したお知らせは published で作られる */
export type NoticeStatus = "draft" | "pending" | "published";

export const noticeStatusLabel: Record<NoticeStatus, string> = {
	draft: "下書き",
	pending: "承認待ち",
	published: "公開中",
};

/** お知らせ1件（GET /api/notices の各件・GET /api/notices/:id） */
export type Notice = {
	id: string;
	title: string;
	body: string;
	/** 画像の署名付きURL（画像なしは null） */
	img_url: string | null;
	visibility: NoticeVisibility;
	status: NoticeStatus;
	category: string | null;
	/** 投稿した管理者の名前（退会済みは「元管理者」） */
	admin_name: string;
	created_at: string;
	updated_at: string;
};

/** 管理画面のロール（back/src/db/roleGuard.ts の Role と同じ） */
export type NoticeReaderRole = "owner" | "admin" | "member";

export const noticeReaderRoleLabel: Record<NoticeReaderRole, string> = {
	owner: "オーナー",
	admin: "投稿担当",
	member: "関係者",
};

/** 既読状況に並ぶユーザー（未読側には read_at が無い） */
export type NoticeReader = {
	id: string;
	name: string;
	email: string;
	role: NoticeReaderRole;
	read_at?: string;
};

/** GET /api/notices/:id/reads（対象は削除済みを除く全ユーザー） */
export type NoticeReadStatus = {
	total: number;
	read_count: number;
	unread_count: number;
	read: NoticeReader[];
	unread: NoticeReader[];
};

/** 作成・編集フォームの入力チェック（back の news/create.ts・update.ts と同じ制約） */
export const noticeFormSchema = z.object({
	title: titleSchema,
	body: bodySchema,
	// カテゴリーは任意。空欄なら付けない（編集では空欄にすると外れる）
	category: z.union([z.literal(""), categorySchema]),
});

export type NoticeFormValues = z.input<typeof noticeFormSchema>;

/** 2026/10/05 のような日付 */
export const formatNoticeDate = (iso: string) => {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
};

/** 2026/10/05 18:30 のような日時（既読日時など） */
export const formatNoticeDateTime = (iso: string) => {
	const date = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${formatNoticeDate(iso)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** 既読率（0〜100 の整数。対象が0人なら0） */
export const toReadRate = (status: NoticeReadStatus) =>
	status.total === 0 ? 0 : Math.round((status.read_count / status.total) * 100);
