// 署名付きURLを新しいタブで開く（原本写真・資料のダウンロード用）。
// back は Content-Disposition を付けないため、ブラウザで開いてから保存してもらう。

/**
 * URL の発行を待ってから新しいタブで開く。
 * await の後に window.open するとポップアップとしてブロックされる（特に iPhone の Safari）ため、
 * クリック直後に空のタブを開いておき、URL が届いたらそこへ移動する。
 */
export const openIssuedUrl = async (issue: () => Promise<string>) => {
	const tab = window.open("", "_blank");
	if (tab) tab.opener = null;
	try {
		const url = await issue();
		if (tab) {
			tab.location.href = url;
		} else {
			// タブを開けなかった（ブロックされた）場合は今のタブで開く
			window.location.href = url;
		}
	} catch (error) {
		tab?.close();
		throw error;
	}
};
