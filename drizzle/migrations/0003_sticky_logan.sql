CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"url" text NOT NULL,
	"events" text[] DEFAULT '{}'::text[] NOT NULL,
	"secret" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_endpoints_api_key" ON "webhook_endpoints" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_endpoints_active" ON "webhook_endpoints" USING btree ("is_active") WHERE "webhook_endpoints"."is_active" = true;