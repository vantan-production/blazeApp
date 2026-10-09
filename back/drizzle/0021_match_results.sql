-- 試合結果（公開サイトの「前回の試合結果」に出す）
--
-- 大会の中の1試合を1行で持つ。大会での最終成績（ベスト8・優勝など）は任意。
-- 公開ページは played_on（試合日）の新しい順に並べ、先頭の1件を「前回の試合結果」にする。
--
-- 番号を 0021 にしているのは、未マージの feature/trial-notice-mail が 0020_trial_notice を使っているため。
-- drizzle の migrator は「最後に適用した when より後」のものだけを適用するので、
-- 0020 を含むブランチを先に dev へマージすること（逆順だと 0020 が適用されずに飛ばされる）。
CREATE TABLE "match_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"tournament_name" varchar(100) NOT NULL,
	"tournament_result" varchar(30),
	"played_on" date NOT NULL,
	"opponent_name" varchar(50) NOT NULL,
	"our_score" integer NOT NULL,
	"opponent_score" integer NOT NULL,
	"admin_id" uuid,
	CONSTRAINT "match_results_our_score_check" CHECK ("our_score" >= 0),
	CONSTRAINT "match_results_opponent_score_check" CHECK ("opponent_score" >= 0)
);
--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_results_played_on_idx" ON "match_results" USING btree ("played_on" DESC,"created_at" DESC);
