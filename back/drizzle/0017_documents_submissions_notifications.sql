-- 資料庫・投稿申請・通知設定（ロール設計 Phase 4）
--
-- news.status / game.status は既存データをすべて 'published'（公開中）として扱う。
-- member の投稿申請だけが 'pending' で作られ、admin の承認で 'published' になる。
ALTER TABLE "news" ADD COLUMN "status" varchar(10) DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "status" varchar(10) DEFAULT 'published' NOT NULL;--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(30),
	"admin_id" uuid
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"notice_email" boolean DEFAULT true NOT NULL,
	"survey_email" boolean DEFAULT true NOT NULL,
	CONSTRAINT "notification_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "document_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
