CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."dream_board_status" AS ENUM('draft', 'active', 'funded', 'closed', 'paid_out', 'expired', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."gift_type" AS ENUM('takealot_product', 'philanthropy');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_provider" AS ENUM('payfast', 'ozow', 'snapscan');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payout_method" AS ENUM('takealot_gift_card', 'karri_card_topup', 'philanthropy_donation');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payout_type" AS ENUM('takealot_gift_card', 'philanthropy_donation', 'karri_card_topup');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_name" varchar(100) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"rate_limit" integer DEFAULT 1000 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dream_board_id" uuid NOT NULL,
	"contributor_name" varchar(100),
	"message" text,
	"amount_cents" integer NOT NULL,
	"fee_cents" integer NOT NULL,
	"net_cents" integer GENERATED ALWAYS AS ((amount_cents - fee_cents)) STORED,
	"payment_provider" "payment_provider" NOT NULL,
	"payment_ref" varchar(255) NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "valid_amount" CHECK ("amount_cents" >= 2000)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dream_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"slug" varchar(100) NOT NULL,
	"child_name" varchar(50) NOT NULL,
	"child_photo_url" text NOT NULL,
	"birthday_date" date NOT NULL,
	"gift_type" "gift_type" NOT NULL,
	"gift_data" jsonb NOT NULL,
	"goal_cents" integer NOT NULL,
	"payout_method" "payout_method" NOT NULL,
	"overflow_gift_data" jsonb,
	"message" text,
	"deadline" timestamp with time zone NOT NULL,
	"status" "dream_board_status" DEFAULT 'draft' NOT NULL,
	"payout_email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "valid_goal" CHECK ("goal_cents" >= 2000),
	CONSTRAINT "valid_deadline" CHECK ("deadline" > "created_at"),
	CONSTRAINT "payout_method_valid" CHECK (("gift_type" = 'takealot_product' AND "payout_method" IN ('takealot_gift_card', 'karri_card_topup')) OR ("gift_type" = 'philanthropy' AND "payout_method" = 'philanthropy_donation')),
	CONSTRAINT "overflow_required" CHECK (("gift_type" = 'takealot_product' AND "overflow_gift_data" IS NOT NULL) OR ("gift_type" = 'philanthropy')),
	CONSTRAINT "dream_boards_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hosts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dream_board_id" uuid NOT NULL,
	"type" "payout_type" NOT NULL,
	"gross_cents" integer NOT NULL,
	"fee_cents" integer NOT NULL,
	"net_cents" integer NOT NULL,
	"recipient_data" jsonb NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"external_ref" varchar(255),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_response_code" integer,
	"last_response_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contributions" ADD CONSTRAINT "contributions_dream_board_id_dream_boards_id_fk" FOREIGN KEY ("dream_board_id") REFERENCES "public"."dream_boards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dream_boards" ADD CONSTRAINT "dream_boards_host_id_hosts_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."hosts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payouts" ADD CONSTRAINT "payouts_dream_board_id_dream_boards_id_fk" FOREIGN KEY ("dream_board_id") REFERENCES "public"."dream_boards"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_prefix" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_active" ON "api_keys" USING btree ("is_active") WHERE "api_keys"."is_active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contributions_dream_board" ON "contributions" USING btree ("dream_board_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contributions_status" ON "contributions" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contributions_payment_ref" ON "contributions" USING btree ("payment_provider","payment_ref");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_payment_ref" ON "contributions" USING btree ("payment_provider","payment_ref");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dream_boards_host" ON "dream_boards" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dream_boards_slug" ON "dream_boards" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dream_boards_status" ON "dream_boards" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dream_boards_deadline" ON "dream_boards" USING btree ("deadline") WHERE "dream_boards"."status" = 'active';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hosts_email" ON "hosts" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payouts_status" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payouts_dream_board" ON "payouts" USING btree ("dream_board_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_events_status" ON "webhook_events" USING btree ("status") WHERE "webhook_events"."status" = 'pending';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_events_api_key" ON "webhook_events" USING btree ("api_key_id");