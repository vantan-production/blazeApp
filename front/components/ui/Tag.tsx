/** ニュースのカテゴリ（Figma: tag 2025:1266 のバリアント） */
export type TagKind = "event" | "tournaments" | "media" | "join trial";

/** 画面に出す日本語のラベル */
const tagLabel: Record<TagKind, string> = {
	event: "イベント",
	tournaments: "大会",
	media: "メディア",
	"join trial": "体験会",
};

type Props = {
	kind: TagKind;
};

/** 白地のカテゴリタグ */
export function Tag({ kind }: Props) {
	return (
		<span className="inline-flex items-center justify-center overflow-hidden rounded-[200px] bg-white px-[10px] text-[12px] leading-[22px] tracking-[1px] whitespace-nowrap text-brand-blue">
			{tagLabel[kind]}
		</span>
	);
}
