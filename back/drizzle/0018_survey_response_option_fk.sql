-- survey_responses が「別アンケートの選択肢」を指せてしまう穴を塞ぐ。
--
-- survey_id と option_id を独立したFKにしていたため、アンケートAのIDと
-- アンケートBの選択肢IDを組み合わせた行が、どの制約にも触れずに入ってしまう。
-- そうなると集計（survey/results.ts）が静かに壊れる。
-- 参照先に (id, survey_id) の一意制約を足し、複合FKで「同じアンケートのもの」に縛る。
--
-- 複合FKの追加は既存行も検査する。0015 の独立FKでは不整合な行が入りえたため、
-- 残っていると ALTER が失敗し、起動時マイグレーション（runMigrations）ごと落ちて
-- アプリが上がらなくなる。先に不整合な行を取り除いてから制約を足す。
-- これらの行は「回答したアンケートに存在しない選択肢」を指しており、
-- どちらのアンケートの回答として数えるべきかを決める根拠が無い。
-- 集計に載せれば結果を歪めるだけなので、修復ではなく削除が唯一の扱い方になる。
-- 通常は0件（respondToSurvey が選択肢の所属をアプリ側で検証している）。
DELETE FROM "survey_responses" r
WHERE NOT EXISTS (
  SELECT 1 FROM "survey_options" o
  WHERE o."id" = r."option_id" AND o."survey_id" = r."survey_id"
);--> statement-breakpoint
ALTER TABLE "survey_options" ADD CONSTRAINT "survey_options_id_survey_id_uniq" UNIQUE("id","survey_id");--> statement-breakpoint
ALTER TABLE "survey_responses" DROP CONSTRAINT "survey_responses_option_id_survey_options_id_fk";--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_option_survey_fk" FOREIGN KEY ("option_id","survey_id") REFERENCES "public"."survey_options"("id","survey_id") ON DELETE cascade ON UPDATE no action;
