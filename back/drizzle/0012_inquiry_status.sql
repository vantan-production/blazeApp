-- 問い合わせに自動返信の宛先（email）と対応ステータス（status）を追加。
-- 既存データにはemailが無いためnullable、statusは'pending'（未対応）で埋める。
ALTER TABLE "inquiry" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "inquiry" ADD COLUMN "status" varchar(20) DEFAULT 'pending' NOT NULL;
