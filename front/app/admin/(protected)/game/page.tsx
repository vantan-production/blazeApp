import { GameImageForm } from "@/components/admin/game/GameImageForm";

export const metadata = {
	title: "試合風景更新 | 西尾ブレイズ 管理画面",
};

/** 試合風景の更新（Figma: game 2034:1657）。デザインに見出しボックスは無いため見出しは読み上げ用のみ */
export default function AdminGamePage() {
	return (
		<main className="flex w-full flex-1 flex-col px-[47px] pt-[82px] pb-[68px]">
			<h1 className="sr-only">試合風景更新</h1>
			{/* TODO: 投稿済み試合風景の一覧・掲載同意・モザイク処理（デザイン未作成。API は /api/gameImg 配下にある） */}
			<GameImageForm />
		</main>
	);
}
