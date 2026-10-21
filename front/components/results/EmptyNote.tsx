/** 未登録・API停止中で一覧が空のときの表示 */
export function EmptyNote({ children }: { children: React.ReactNode }) {
	return <p className="py-5 text-center text-[16px]">{children}</p>;
}
