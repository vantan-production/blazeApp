import { redirect, unstable_rethrow } from "next/navigation";
import { API_BASE_URL } from "./apiClient";

/** back の一覧APIの1ページあたりの件数（back/src/utils/pagination.ts の PAGE_SIZE。固定値） */
export const PAGE_SIZE = 10;

/** 一覧のページ情報。back/src/utils/pagination.ts の buildPagination に対応する */
export type PageInfo = {
	page: number;
	/** 総ページ数。記事0件やback未接続のときは0 */
	totalPages: number;
};

export type Paginated<T> = {
	items: T[];
	pagination: PageInfo;
};

type ListResponse<T> = {
	success: boolean;
	data: T[];
	// 旧版のbackはページネーション無しで全件を返すため、無い場合も考慮する
	pagination?: { page: number; totalPages: number };
};

type SearchParamValue = string | string[] | undefined;

/** クエリの ?page= を1以上の整数にする。不正な値は1ページ目扱い（back の parsePage と同じ） */
export function parsePageParam(value: SearchParamValue): number {
	const raw = Number(Array.isArray(value) ? value[0] : value);
	return Number.isInteger(raw) && raw > 0 ? raw : 1;
}

/**
 * 指定ページのURLを組み立てる。他のクエリ（並び順など）は引き継ぐ。
 * 1ページ目は ?page= を付けず、同じ内容のURLが2通りにならないようにする
 */
export function pageHref(
	pathname: string,
	page: number,
	params: Record<string, string | undefined> = {},
): string {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) query.set(key, value);
	}
	if (page > 1) query.set("page", String(page));
	const qs = query.toString();
	return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * 公開一覧APIの1ページ分を取得する。
 * backが落ちていてもページ全体をエラーにせず空表示にするため、通信・APIの失敗は空の結果にする。
 * ただし searchParams・redirect など Next.js 内部の例外まで握りつぶすと
 * 動的レンダリングの判定が壊れるため、それらは unstable_rethrow でそのまま投げ直す
 */
export async function fetchPaginatedList<T>(
	endpoint: string,
	query: Record<string, string | number>,
	init: RequestInit,
): Promise<Paginated<T>> {
	const empty: Paginated<T> = {
		items: [],
		pagination: { page: 1, totalPages: 0 },
	};
	const search = new URLSearchParams(
		Object.entries(query).map(([key, value]) => [key, String(value)]),
	);
	try {
		const res = await fetch(`${API_BASE_URL}${endpoint}?${search}`, init);
		if (!res.ok) {
			console.error(`${endpoint} の取得に失敗しました（${res.status}）`);
			return empty;
		}
		const body = (await res.json()) as ListResponse<T>;
		const items = Array.isArray(body.data) ? body.data : [];
		return {
			items,
			pagination: body.pagination
				? { page: body.pagination.page, totalPages: body.pagination.totalPages }
				: { page: 1, totalPages: items.length > 0 ? 1 : 0 },
		};
	} catch (error) {
		unstable_rethrow(error);
		console.error(error);
		return empty;
	}
}

/**
 * 総ページ数を超えるページ（記事が減った後の古いリンクなど）を開いたら、最後のページへ移す。
 * 0件・back未接続のときは移す先が無いので、そのまま空表示にする
 */
export function redirectIfPageOutOfRange(
	requestedPage: number,
	{ totalPages }: PageInfo,
	hrefForPage: (page: number) => string,
): void {
	if (totalPages > 0 && requestedPage > totalPages) {
		redirect(hrefForPage(totalPages));
	}
}
