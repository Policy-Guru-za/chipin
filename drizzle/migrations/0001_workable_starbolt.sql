DO $$ BEGIN
 CREATE TYPE "public"."audit_actor_type" AS ENUM('admin', 'host', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payout_item_type" AS ENUM('gift', 'overflow');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_id" uuid,
	"actor_email" varchar(255),
	"action" varchar(100) NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"target_id" varchar(100) NOT NULL,
	"metadata" jsonb,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payout_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" uuid NOT NULL,
	"dream_board_id" uuid NOT NULL,
	"type" "payout_item_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payout_items" ADD CONSTRAINT "valid_payout_item_amount" CHECK ("amount_cents" >= 0);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_payout_id_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payouts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_dream_board_id_dream_boards_id_fk" FOREIGN KEY ("dream_board_id") REFERENCES "public"."dream_boards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_target" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor" ON "audit_logs" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payout_items_payout" ON "payout_items" USING btree ("payout_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payout_items_dream_board" ON "payout_items" USING btree ("dream_board_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payout_items_type" ON "payout_items" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_payout_item_type" ON "payout_items" USING btree ("payout_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_payout_dream_board_type" ON "payouts" USING btree ("dream_board_id","type");