-- 関係者限定お知らせ（ロール設計 Phase 1）
-- news に公開範囲を追加し、既存データはすべて公開扱い（'public'）にする。
-- type には 'notice'（関係者向け事務連絡）が加わるが、既存の type 値は変更しない。
ALTER TABLE "news" ADD COLUMN "visibility" varchar(10) DEFAULT 'public' NOT NULL;--> statement-breakpoint
CREATE TABLE "news_reads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"news_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "news_reads_news_user_uniq" UNIQUE("news_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "news_reads" ADD CONSTRAINT "news_reads_news_id_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_reads" ADD CONSTRAINT "news_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
