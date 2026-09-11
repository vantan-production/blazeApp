-- survey_responses が「別アンケートの選択肢」を指せてしまう穴を塞ぐ。
--
-- survey_id と option_id を独立したFKにしていたため、アンケートAのIDと
-- アンケートBの選択肢IDを組み合わせた行が、どの制約にも触れずに入ってしまう。
-- そうなると集計（survey/results.ts）が静かに壊れる。
-- 参照先に (id, survey_id) の一意制約を足し、複合FKで「同じアンケートのもの」に縛る。
ALTER TABLE "survey_options" ADD CONSTRAINT "survey_options_id_survey_id_uniq" UNIQUE("id","survey_id");--> statement-breakpoint
ALTER TABLE "survey_responses" DROP CONSTRAINT "survey_responses_option_id_survey_options_id_fk";--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_option_survey_fk" FOREIGN KEY ("option_id","survey_id") REFERENCES "public"."survey_options"("id","survey_id") ON DELETE cascade ON UPDATE no action;
