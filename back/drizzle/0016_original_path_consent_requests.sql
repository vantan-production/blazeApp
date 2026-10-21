-- 原本保全と掲載取り下げ依頼（ロール設計 Phase 3）
--
-- images.original_path: モザイク適用時に退避する原本のS3パス。
-- 既存データは NULL のまま（path がそのまま原本。まだモザイクを適用していない）。
ALTER TABLE "images" ADD COLUMN "original_path" varchar(500);--> statement-breakpoint
CREATE TABLE "consent_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"image_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"reason" text,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"handled_by" uuid,
	"handled_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
