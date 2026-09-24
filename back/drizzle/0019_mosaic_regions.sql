-- モザイクの再編集（領域の保存・解除）
--
-- images.mosaic_regions: 適用中のモザイク領域一覧（jsonb配列）。未適用なら NULL。
-- 再適用は常に original_path の原本に「この一覧」をかけ直して作るため、
-- 領域の追加・移動・削除・粗さ変更を何度でもやり直せる。
ALTER TABLE "images" ADD COLUMN "mosaic_regions" jsonb;
