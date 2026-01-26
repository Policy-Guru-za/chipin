CREATE TABLE IF NOT EXISTS "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "partners" ("id", "name", "created_at")
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Partner', now())
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "partner_id" uuid;--> statement-breakpoint
ALTER TABLE "contributions" ADD COLUMN "partner_id" uuid;--> statement-breakpoint
ALTER TABLE "dream_boards" ADD COLUMN "partner_id" uuid;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "partner_id" uuid;--> statement-breakpoint
UPDATE "api_keys" SET "partner_id" = '00000000-0000-0000-0000-000000000001' WHERE "partner_id" IS NULL;--> statement-breakpoint
UPDATE "dream_boards" SET "partner_id" = '00000000-0000-0000-0000-000000000001' WHERE "partner_id" IS NULL;--> statement-breakpoint
UPDATE "contributions" SET "partner_id" = '00000000-0000-0000-0000-000000000001' WHERE "partner_id" IS NULL;--> statement-breakpoint
UPDATE "payouts" SET "partner_id" = '00000000-0000-0000-0000-000000000001' WHERE "partner_id" IS NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "partner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "contributions" ALTER COLUMN "partner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dream_boards" ALTER COLUMN "partner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payouts" ALTER COLUMN "partner_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_partners_name" ON "partners" USING btree ("name");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contributions" ADD CONSTRAINT "contributions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dream_boards" ADD CONSTRAINT "dream_boards_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payouts" ADD CONSTRAINT "payouts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_partner" ON "api_keys" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contributions_partner" ON "contributions" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dream_boards_partner" ON "dream_boards" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payouts_partner" ON "payouts" USING btree ("partner_id");