// heic-decode は型定義を同梱していないため最小限の宣言を置く。
// libheif の WASM ビルドでHEICを生のRGBAピクセルに展開する。
declare module "heic-decode" {
	type DecodeResult = {
		width: number;
		height: number;
		data: Uint8ClampedArray;
	};
	function decode(input: {
		buffer: Buffer | Uint8Array;
	}): Promise<DecodeResult>;
	export default decode;
}
