-- 試合結果（公開サイトの「前回の試合結果」に出す）
--
-- 大会ごとの結果を1行で持つ。大会での最終成績（ベスト8・優勝など）は任意。
-- 対戦相手は任意で、決勝・3位決定戦など載せたい試合があるときだけ入れる。
-- そのときはセットごとの得点（1〜3セット）を sets に [{"our_score":9,"opponent_score":8}, ...] の形で持つ。
-- 対戦相手が無ければ sets は空配列（大会名と成績だけの記録）。
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
	"opponent_name" varchar(50),
	"sets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"admin_id" uuid,
	CONSTRAINT "match_results_sets_check" CHECK (jsonb_typeof("sets") = 'array' AND jsonb_array_length("sets") <= 3),
	CONSTRAINT "match_results_opponent_sets_check" CHECK (("opponent_name" IS NULL) = (jsonb_array_length("sets") = 0))
);
--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_results_played_on_idx" ON "match_results" USING btree ("played_on" DESC,"created_at" DESC);
