"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminButtonLink } from "@/components/admin/AdminButton";
import type { ApiSuccess } from "@/lib/admin/api";
import { adminRoutes } from "@/lib/admin/routes";
import {
	ageOf,
	formatAppliedAt,
	formatDate,
	formatDateWithWeekday,
	isPastTrialDate,
	labelOf,
	schoolGradeOf,
	type TrialApplication,
	trialGenderLabel,
	trialMotivationLabel,
} from "@/lib/admin/trialApplications";
import { ApiError, apiClient } from "@/lib/apiClient";

type Props = {
	id: string;
};

type Row = {
	label: string;
	value: React.ReactNode;
};

type SectionProps = {
	title: string;
	rows: Row[];
};

/** 項目名と値を並べるカード（問い合わせ詳細のお客様情報カードと同じ見た目） */
function InfoSection({ title, rows }: SectionProps) {
	return (
		<section className="flex w-full flex-col gap-2">
			<h2 className="text-[16px] leading-[22px] font-medium tracking-[1px]">
				{title}
			</h2>
			<dl className="grid w-full grid-cols-[96px_1fr] gap-x-[10px] gap-y-[6px] rounded-[10px] border border-brand-white px-[10px] py-[8px] leading-[22px] tracking-[1px] text-white">
				{rows.map((row) => (
					<div key={row.label} className="contents">
						<dt className="text-[10px]">{row.label}</dt>
						<dd className="text-[14px] break-all whitespace-pre-wrap">
							{row.value}
						</dd>
					</div>
				))}
			</dl>
		</section>
	);
}

const linkClass = "underline underline-offset-2";

/**
 * 体験申し込みの詳細（GET /api/trial-application/:id）。申し込みフォームの全項目を日本語の項目名で表示する。
 * 未成年の個人情報なので、画面には申し込み内容だけを出し、URL には申し込みIDしか載せない
 */
export function TrialApplicationDetail({ id }: Props) {
	const [application, setApplication] = useState<TrialApplication | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;
		apiClient<ApiSuccess<TrialApplication>>(`/api/trial-application/${id}`)
			.then((res) => {
				if (!ignore) setApplication(res.data);
			})
			.catch((err) => {
				if (ignore) return;
				setError(
					err instanceof ApiError && err.status === 404
						? "体験申し込みが見つかりません。"
						: "体験申し込みの取得に失敗しました。",
				);
			});
		return () => {
			ignore = true;
		};
	}, [id]);

	const backLink = (
		<Link
			href={adminRoutes.trialApplications}
			className="text-[14px] leading-[22px] tracking-[1px] text-brand-white underline"
		>
			体験申し込み一覧に戻る
		</Link>
	);

	if (error) {
		return (
			<div className="flex w-full flex-col items-center gap-6">
				<p className="text-[14px] text-brand-white">{error}</p>
				{backLink}
			</div>
		);
	}

	if (!application) {
		return <p className="text-[14px] text-brand-white">読み込み中…</p>;
	}

	const age = ageOf(application.birth_date);
	const grade = schoolGradeOf(application.birth_date);
	const past = isPastTrialDate(application.trial_date);

	const trialRows: Row[] = [
		{
			label: "体験希望日",
			value: `${formatDateWithWeekday(application.trial_date)}${past ? "（過ぎています）" : ""}`,
		},
		{ label: "申し込み日時", value: formatAppliedAt(application.created_at) },
	];

	const childRows: Row[] = [
		{ label: "お名前", value: application.name },
		{ label: "フリガナ", value: application.furigana },
		{ label: "性別", value: labelOf(trialGenderLabel, application.gender) },
		{
			label: "生年月日",
			value: `${formatDate(application.birth_date)}${age !== null ? `（${age}歳）` : ""}`,
		},
		{
			label: "学年（目安）",
			value: grade ?? "-",
		},
		{ label: "学校名", value: application.school_name },
		{ label: "塾", value: application.cram_school || "なし" },
	];

	const contactRows: Row[] = [
		{
			label: "電話番号",
			value: (
				<a href={`tel:${application.phone_number}`} className={linkClass}>
					{application.phone_number}
				</a>
			),
		},
		{
			label: "メールアドレス",
			value: (
				<a href={`mailto:${application.email}`} className={linkClass}>
					{application.email}
				</a>
			),
		},
	];

	const motivationRows: Row[] = [
		{
			label: "きっかけ",
			value: labelOf(trialMotivationLabel, application.motivation),
		},
	];
	if (application.motivation_other) {
		motivationRows.push({
			label: "その他の内容",
			value: application.motivation_other,
		});
	}
	if (application.referrer_name) {
		motivationRows.push({
			label: "紹介者のお名前",
			value: application.referrer_name,
		});
	}

	return (
		<article className="flex w-full flex-col items-center gap-8 text-brand-white">
			<InfoSection title="体験の予定" rows={trialRows} />
			<InfoSection title="お子さんの情報" rows={childRows} />
			<InfoSection title="連絡先" rows={contactRows} />
			<InfoSection title="体験のきっかけ" rows={motivationRows} />
			<p className="w-full text-[10px] leading-[16px] tracking-[1px]">
				学年は生年月日から計算した目安です。
			</p>

			<section className="flex w-full flex-col gap-2">
				<AdminButtonLink
					href={adminRoutes.trialNoticesNew}
					variant="light"
					size="sm"
				>
					連絡メールを送る
				</AdminButtonLink>
				<p className="text-[10px] leading-[16px] tracking-[1px]">
					送信画面で体験日（{formatDateWithWeekday(application.trial_date)}
					）を選ぶと、この方を宛先に選べます。
				</p>
			</section>

			{backLink}
		</article>
	);
}
