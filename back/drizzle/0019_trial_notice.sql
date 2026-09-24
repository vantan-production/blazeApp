-- 体験申込者への連絡（保護者向け連絡事項のメール送信履歴）
-- これまで公開ページ（/activities）に載せていた連絡事項を、管理者が選んだ体験申込者にだけメールで届ける。
-- 送信に成功した宛先だけを trial_notice_recipient に残す。名前・アドレス・体験日は送信時点の写しを持ち、
-- 申込データが削除されても「いつ誰に何を送ったか」を確認できるようにする。
CREATE TABLE "trial_notice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"title" varchar(100) NOT NULL,
	"body" text NOT NULL,
	"recipient_count" integer NOT NULL,
	"admin_id" uuid
);
--> statement-breakpoint
CREATE TABLE "trial_notice_recipient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notice_id" uuid NOT NULL,
	"trial_application_id" uuid,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"trial_date" date NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trial_notice" ADD CONSTRAINT "trial_notice_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_notice_recipient" ADD CONSTRAINT "trial_notice_recipient_notice_id_trial_notice_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."trial_notice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trial_notice_recipient" ADD CONSTRAINT "trial_notice_recipient_application_id_fk" FOREIGN KEY ("trial_application_id") REFERENCES "public"."trial_application"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trial_notice_recipient_notice_id_idx" ON "trial_notice_recipient" USING btree ("notice_id");
