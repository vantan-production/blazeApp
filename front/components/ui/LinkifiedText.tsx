// http(s) で始まり、空白・山括弧・引用符・全角の区切り文字の手前までを URL とみなす
const URL_PATTERN = /https?:\/\/[^\s<>"'「」『』（）、。]+/g;
// 文末の句読点や閉じ括弧は URL に含めない（「…を見てください https://example.com.」など）
const TRAILING_PUNCTUATION = /[.,!?;:)\]]+$/;

type Props = {
	text: string;
};

/** プレーンテキストの本文を表示し、中の URL だけをリンクにする（別タブで開く） */
export function LinkifiedText({ text }: Props) {
	const nodes: React.ReactNode[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(URL_PATTERN)) {
		const url = match[0].replace(TRAILING_PUNCTUATION, "");
		const start = match.index;
		if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
		nodes.push(
			<a
				key={start}
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="underline underline-offset-2 transition-opacity hover:opacity-80"
			>
				{url}
			</a>,
		);
		lastIndex = start + url.length;
	}
	if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

	return <>{nodes}</>;
}
