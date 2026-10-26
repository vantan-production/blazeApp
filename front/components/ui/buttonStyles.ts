/**
 * サイト共通のボタンの見た目。リンク（Link）とボタン（button）のどちらにも付けられるようにクラス文字列で持つ。
 * 主ボタンは黄色のピル型、副ボタンは同じ形の枠線のみ（白背景の上では紺、紺背景の上では白）。
 */
const baseButtonClass =
	"inline-flex h-[52px] w-full max-w-[342px] cursor-pointer items-center justify-center rounded-full px-8 text-[16px] font-medium tracking-[1px] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60";

export const primaryButtonClass = `${baseButtonClass} bg-brand-yellow text-brand-blue`;

export const secondaryButtonClass = `${baseButtonClass} border-2 border-brand-blue text-brand-blue`;
