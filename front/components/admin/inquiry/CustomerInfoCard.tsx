type Props = {
	name: string;
	email: string | null;
};

/** 問い合わせたお客様の情報（Figma: Frame 118 2027:1322） */
export function CustomerInfoCard({ name, email }: Props) {
	const rows = [
		{ label: "名前", value: name },
		{ label: "メールアドレス", value: email ?? "-" },
		// TODO: 電話番号は問い合わせAPIに項目が無いため表示しない（Figma には「電話番号」行がある）
	];

	return (
		<dl className="grid w-full grid-cols-[88px_1fr] gap-x-[10px] gap-y-[2px] rounded-[10px] border border-brand-white px-[10px] py-[5px] leading-[22px] tracking-[1px] text-white">
			{rows.map((row) => (
				<div key={row.label} className="contents">
					<dt className="text-[10px]">{row.label}</dt>
					<dd className="text-[12px] break-all">{row.value}</dd>
				</div>
			))}
		</dl>
	);
}
